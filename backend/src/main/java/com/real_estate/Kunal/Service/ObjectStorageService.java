package com.real_estate.Kunal.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ObjectStorageService {

    public record StoredObject(byte[] bytes, String contentType, long contentLength) {
    }

    private enum BucketType {
        PROJECT_DOCS,
        CHAT_DOCS,
        KYC_DOCS
    }

    private record ResolvedPath(boolean s3, String value, boolean absoluteLocalPath) {
    }

    private final S3Client s3Client;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.local-root:uploads}")
    private String localRoot;

    @Value("${aws.s3.project-docs-bucket:}")
    private String projectDocsBucket;

    @Value("${aws.s3.chat-docs-bucket:}")
    private String chatDocsBucket;

    @Value("${aws.s3.kyc-docs-bucket:}")
    private String kycDocsBucket;

    @Value("${aws.s3.kyc-kms-key-id:}")
    private String kycKmsKeyId;

    public String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            throw new RuntimeException("File name is missing");
        }

        String safeName;
        try {
            safeName = Paths.get(fileName).getFileName().toString();
        } catch (InvalidPathException ex) {
            throw new RuntimeException("Invalid file name", ex);
        }

        safeName = safeName.replace("..", "_").trim();
        if (safeName.isBlank()) {
            throw new RuntimeException("File name is invalid");
        }
        return safeName;
    }

    public String storeProjectDocument(
            MultipartFile file,
            Long projectId,
            Long configId,
            String safeOriginalFileName,
            String contentType
    ) throws IOException {
        String objectKey = buildProjectKey(projectId, configId, safeOriginalFileName);
        storeObject(BucketType.PROJECT_DOCS, objectKey, file, contentType);
        return useS3() ? "s3:" + objectKey : "local:" + objectKey;
    }

    public String storeProjectCoverPhoto(
            MultipartFile file,
            Long projectId,
            String safeOriginalFileName,
            String contentType
    ) throws IOException {
        String objectKey = buildProjectCoverKey(projectId, safeOriginalFileName);
        storeObject(BucketType.PROJECT_DOCS, objectKey, file, contentType);
        return useS3() ? "s3:" + objectKey : "local:" + objectKey;
    }

    public String storeKycDocument(
            MultipartFile file,
            String ownerSegment,
            String documentType,
            String safeOriginalFileName,
            String contentType
    ) throws IOException {
        String objectKey = buildKycKey(ownerSegment, documentType, safeOriginalFileName);
        storeObject(BucketType.KYC_DOCS, objectKey, file, contentType);
        return objectKey;
    }

    public StoredObject loadKycDocument(String objectKey) throws IOException {
        if (useS3()) {
            return loadObjectFromS3(BucketType.KYC_DOCS, objectKey);
        }
        return loadObjectFromLocal(objectKey, false);
    }

    public StoredObject loadProjectDocument(String storedPath) throws IOException {
        ResolvedPath resolvedPath = resolveStoredPath(storedPath);
        if (resolvedPath.s3()) {
            return loadObjectFromS3(BucketType.PROJECT_DOCS, resolvedPath.value());
        }
        return loadObjectFromLocal(resolvedPath.value(), resolvedPath.absoluteLocalPath());
    }

    public void deleteProjectDocument(String storedPath) {
        ResolvedPath resolvedPath = resolveStoredPath(storedPath);
        if (resolvedPath.s3()) {
            deleteObjectFromS3(BucketType.PROJECT_DOCS, resolvedPath.value());
            return;
        }
        deleteObjectFromLocal(resolvedPath.value(), resolvedPath.absoluteLocalPath());
    }

    public void storeChatAttachment(MultipartFile file, String storedName, String contentType) throws IOException {
        String safeName = sanitizeFileName(storedName);
        String objectKey = "chat/" + safeName;
        storeObject(BucketType.CHAT_DOCS, objectKey, file, contentType);
    }

    public String storeChatAttachment(
            MultipartFile file,
            String conversationId,
            String storedName,
            String contentType
    ) throws IOException {
        String objectKey = buildChatAttachmentKey(conversationId, storedName, contentType);
        storeObject(BucketType.CHAT_DOCS, objectKey, file, contentType);
        return useS3() ? "s3:" + objectKey : "local:" + objectKey;
    }

    public StoredObject loadChatAttachment(String filename) throws IOException {
        String objectKey = resolveChatAttachmentKey(filename);
        if (useS3()) {
            return loadObjectFromS3(BucketType.CHAT_DOCS, objectKey);
        }
        return loadObjectFromLocal(objectKey, false);
    }

    private String resolveChatAttachmentKey(String filename) throws IOException {
        String safeName = sanitizeFileName(filename);
        String directKey = "chat/" + safeName;
        if (useS3()) {
            String bucket = getBucketName(BucketType.CHAT_DOCS);
            try {
                s3Client.headObject(HeadObjectRequest.builder()
                        .bucket(bucket)
                        .key(directKey)
                        .build());
                return directKey;
            } catch (Exception ignored) {
                // Fall through to nested key lookup.
            }
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix("chat/")
                    .build();
            for (S3Object object : s3Client.listObjectsV2Paginator(request).contents()) {
                String key = object.key();
                if (key != null && key.endsWith("/" + safeName)) {
                    return key;
                }
            }
            throw new IOException("Chat attachment not found in S3");
        }

        Path chatRoot = getLocalRootPath().resolve("chat").normalize();
        if (!Files.exists(chatRoot)) {
            throw new IOException("Chat attachment not found on disk");
        }
        try (Stream<Path> files = Files.walk(chatRoot)) {
            Path match = files
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equals(safeName))
                    .findFirst()
                    .orElse(null);
            if (match == null) {
                throw new IOException("Chat attachment not found on disk");
            }
            return getLocalRootPath().relativize(match).toString().replace('\\', '/');
        }
    }

    private void storeObject(BucketType bucketType, String objectKey, MultipartFile file, String contentType) throws IOException {
        if (useS3()) {
            putObjectToS3(bucketType, objectKey, file, contentType);
            return;
        }
        putObjectToLocal(objectKey, file);
    }

    private void putObjectToS3(BucketType bucketType, String objectKey, MultipartFile file, String contentType) throws IOException {
        String bucket = getBucketName(bucketType);

        log.info("S3 upload START: bucket={}, key={}, size={}", bucket, objectKey, file.getSize());

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();

        if (bucketType == BucketType.KYC_DOCS) {
            PutObjectRequest.Builder requestBuilder = request.toBuilder()
                    .serverSideEncryption(ServerSideEncryption.AWS_KMS);
            if (kycKmsKeyId != null && !kycKmsKeyId.isBlank()) {
                requestBuilder.ssekmsKeyId(kycKmsKeyId.trim());
            }
            request = requestBuilder.build();
        }

        try {
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("S3 upload SUCCESS: key={}", objectKey);

            verifyS3Upload(bucket, objectKey);
        } catch (Exception ex) {
            log.error("S3 upload FAILED: bucket={}, key={}, error={}", bucket, objectKey, ex.getMessage(), ex);
            throw new IOException("Failed to upload file to S3 bucket " + bucket + ": " + ex.getMessage(), ex);
        }
    }

    private void verifyS3Upload(String bucket, String key) throws IOException {
        try {
            HeadObjectRequest verifyReq = HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            s3Client.headObject(verifyReq);
            log.info("S3 verify SUCCESS: key={}", key);
        } catch (Exception ex) {
            log.error("S3 verify FAILED: key={}, error={}", key, ex.getMessage());
            throw new IOException("S3 upload verification failed for key: " + key, ex);
        }
    }

    private StoredObject loadObjectFromS3(BucketType bucketType, String objectKey) throws IOException {
        String bucket = getBucketName(bucketType);

        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();

        try {
            ResponseBytes<GetObjectResponse> responseBytes = s3Client.getObjectAsBytes(request);
            GetObjectResponse response = responseBytes.response();

            String contentType = response.contentType();
            long contentLength = response.contentLength() != null
                    ? response.contentLength()
                    : responseBytes.asByteArray().length;

            return new StoredObject(responseBytes.asByteArray(), contentType, contentLength);
        } catch (S3Exception ex) {
            int statusCode = ex.statusCode();
            String awsMessage = ex.awsErrorDetails() != null ? ex.awsErrorDetails().errorMessage() : ex.getMessage();
            log.error("S3 read FAILED: bucket={}, key={}, status={}, message={}", bucket, objectKey, statusCode, awsMessage);
            if (statusCode == 404) {
                throw new IOException("File not found in S3", ex);
            }
            throw new IOException("S3 read failed with status " + statusCode + ": " + awsMessage, ex);
        } catch (Exception ex) {
            log.error("S3 read FAILED: bucket={}, key={}, error={}", bucket, objectKey, ex.getMessage(), ex);
            throw new IOException("Failed to read file from S3", ex);
        }
    }

    private void deleteObjectFromS3(BucketType bucketType, String objectKey) {
        String bucket = getBucketName(bucketType);

        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();

        try {
            s3Client.deleteObject(request);
        } catch (Exception ex) {
            log.warn("Could not delete S3 object '{}' from bucket '{}': {}", objectKey, bucket, ex.getMessage());
        }
    }

    private void putObjectToLocal(String objectKey, MultipartFile file) throws IOException {
        Path root = getLocalRootPath();
        Path target = root.resolve(Paths.get(objectKey)).normalize();

        if (!target.startsWith(root)) {
            throw new IOException("Resolved path escapes local upload root");
        }

        Files.createDirectories(target.getParent());
        file.transferTo(target.toFile());
    }

    private StoredObject loadObjectFromLocal(String storedPathOrKey, boolean absolutePath) throws IOException {
        Path path = resolveLocalPath(storedPathOrKey, absolutePath);
        if (!Files.exists(path)) {
            throw new IOException("File not found on disk");
        }

        byte[] bytes = Files.readAllBytes(path);
        String contentType = Files.probeContentType(path);
        return new StoredObject(bytes, contentType, bytes.length);
    }

    private void deleteObjectFromLocal(String storedPathOrKey, boolean absolutePath) {
        try {
            Path path = resolveLocalPath(storedPathOrKey, absolutePath);
            Files.deleteIfExists(path);
        } catch (Exception ex) {
            log.warn("Could not delete local file '{}': {}", storedPathOrKey, ex.getMessage());
        }
    }

    private Path resolveLocalPath(String storedPathOrKey, boolean absolutePath) {
        if (absolutePath) {
            return Paths.get(storedPathOrKey).toAbsolutePath().normalize();
        }

        Path root = getLocalRootPath();
        Path resolved = root.resolve(Paths.get(storedPathOrKey)).normalize();
        if (!resolved.startsWith(root)) {
            throw new RuntimeException("Resolved local path escapes configured upload root");
        }
        return resolved;
    }

    private ResolvedPath resolveStoredPath(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            throw new RuntimeException("Stored file path is missing");
        }

        String cleanPath = storedPath.trim();

        if (cleanPath.startsWith("s3:")) {
            return new ResolvedPath(true, cleanPath.substring(3), false);
        }

        if (cleanPath.startsWith("local:")) {
            return new ResolvedPath(false, cleanPath.substring(6), false);
        }

        if (looksAbsolutePath(cleanPath)) {
            return new ResolvedPath(false, cleanPath, true);
        }

        if (useS3()) {
            return new ResolvedPath(true, cleanPath, false);
        }

        return new ResolvedPath(false, cleanPath, false);
    }

    private String buildChatAttachmentKey(String conversationId, String storedName, String contentType) {
        String safeConversationId = sanitizePathSegment(conversationId, "unassigned");
        String safeName = sanitizeFileName(storedName);
        String normalizedContentType = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";
        String folder = "documents";
        if (normalizedContentType.startsWith("image/")) {
            folder = "images";
        } else if (normalizedContentType.startsWith("video/")) {
            folder = "videos";
        } else if (normalizedContentType.startsWith("audio/")) {
            folder = "audio";
        }
        return "chat/" + safeConversationId + "/" + folder + "/" + safeName;
    }

    private String sanitizePathSegment(String rawValue, String fallback) {
        if (rawValue == null || rawValue.isBlank()) {
            return fallback;
        }
        String sanitized = rawValue.replaceAll("[^A-Za-z0-9._-]", "_");
        return sanitized.isBlank() ? fallback : sanitized;
    }

    private String buildProjectKey(Long projectId, Long configId, String safeOriginalFileName) {
        String extension = getExtension(safeOriginalFileName);
        String objectName = UUID.randomUUID() + extension;

        if (configId == null) {
            return "projects/" + projectId + "/documents/" + objectName;
        }

        return "projects/" + projectId + "/documents/config_" + configId + "/" + objectName;
    }

    private String buildProjectCoverKey(Long projectId, String safeOriginalFileName) {
        String extension = getExtension(safeOriginalFileName);
        return "projects/" + projectId + "/cover/" + UUID.randomUUID() + extension;
    }

    private String buildKycKey(String ownerSegment, String documentType, String safeOriginalFileName) {
        String safeOwner = ownerSegment == null || ownerSegment.isBlank()
                ? "unknown"
                : ownerSegment.replaceAll("[^A-Za-z0-9_-]", "_");
        String safeType = documentType == null || documentType.isBlank()
                ? "document"
                : documentType.toLowerCase(Locale.ROOT);
        return "identity-docs/" + safeOwner + "/" + safeType + "/" + UUID.randomUUID() + "_" + safeOriginalFileName;
    }

    private String getExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0) {
            return "";
        }
        return fileName.substring(dotIndex).toLowerCase(Locale.ROOT);
    }

    private String getBucketName(BucketType bucketType) {
        String bucket = switch (bucketType) {
            case PROJECT_DOCS -> projectDocsBucket;
            case CHAT_DOCS -> chatDocsBucket;
            case KYC_DOCS -> kycDocsBucket;
        };
        if (bucket == null || bucket.isBlank()) {
            throw new RuntimeException("S3 bucket is not configured for " + bucketType);
        }
        return bucket;
    }

    private Path getLocalRootPath() {
        return Paths.get(localRoot).toAbsolutePath().normalize();
    }

    private boolean useS3() {
        return "s3".equalsIgnoreCase(storageType);
    }

    private boolean looksAbsolutePath(String pathValue) {
        try {
            return Paths.get(pathValue).isAbsolute();
        } catch (InvalidPathException ex) {
            return false;
        }
    }

    @Value("${aws.region:ap-south-1}")
    private String awsRegion;

    /**
     * Returns a public HTTPS URL for accessing the stored file.
     * For S3, constructs a virtual-hosted-style URL.
     */
    public String getPublicUrl(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return null;
        }

        String cleanPath = storedPath.trim();

        // If already an HTTP URL, return as-is
        if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
            return cleanPath;
        }

        // Extract the actual path
        String objectKey;
        boolean isS3 = false;
        if (cleanPath.startsWith("s3:")) {
            objectKey = cleanPath.substring(3);
            isS3 = true;
        } else if (cleanPath.startsWith("local:")) {
            objectKey = cleanPath.substring(6);
        } else {
            objectKey = cleanPath;
            isS3 = useS3();
        }

        if (objectKey.startsWith("identity-docs/") || objectKey.startsWith("kyc/")) {
            return null;
        }

        // Determine bucket type from path
        String bucket = objectKey.startsWith("chat/") ? chatDocsBucket
                : projectDocsBucket;

        if (bucket == null || bucket.isBlank()) {
            log.warn("S3 bucket not configured for path: {}", objectKey);
            return null;
        }

        if (isS3 || useS3()) {
            return String.format("https://%s.s3.%s.amazonaws.com/%s",
                    bucket, awsRegion, objectKey);
        }

        // For local files, return a backend API endpoint URL
        return "/api/documents/download/local/" + objectKey.replace("/", "_");
    }
}
