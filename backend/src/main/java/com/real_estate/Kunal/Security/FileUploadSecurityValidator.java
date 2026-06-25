package com.real_estate.Kunal.Security;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class FileUploadSecurityValidator {

    public record ValidatedUpload(String contentType) {
    }

    private static final long MAX_PROJECT_FILE_SIZE = 10L * 1024L * 1024L;
    private static final long MAX_CHAT_FILE_SIZE = 10L * 1024L * 1024L;

    private static final Set<String> PROJECT_ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx", "csv"
    );

    private static final Set<String> IMAGE_ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp"
    );

    private static final Set<String> CHAT_ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "mp4", "webm", "mov",
            "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"
    );

    public ValidatedUpload validateProjectDocument(MultipartFile file, String safeFileName) throws IOException {
        return validate(file, safeFileName, MAX_PROJECT_FILE_SIZE, PROJECT_ALLOWED_EXTENSIONS);
    }

    public ValidatedUpload validateChatAttachment(MultipartFile file, String safeFileName) throws IOException {
        return validate(file, safeFileName, MAX_CHAT_FILE_SIZE, CHAT_ALLOWED_EXTENSIONS);
    }

    public ValidatedUpload validateProjectImage(MultipartFile file, String safeFileName) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > MAX_PROJECT_FILE_SIZE) {
            throw new IllegalArgumentException("File exceeds the allowed size limit");
        }

        String extension = getExtension(safeFileName);
        if (!IMAGE_ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Cover photo must be JPG, PNG, or WebP");
        }

        byte[] bytes = file.getBytes();
        if (bytes.length == 0) {
            throw new IllegalArgumentException("File is empty");
        }

        String detectedContentType = detectImageContentType(bytes);
        if (detectedContentType == null) {
            throw new IllegalArgumentException("Cover photo content is not a supported image type");
        }
        return new ValidatedUpload(detectedContentType);
    }

    public boolean isInlineSafe(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return false;
        }

        String normalized = contentType.toLowerCase(Locale.ROOT);
        return normalized.startsWith("image/")
                || normalized.startsWith("video/")
                || "application/pdf".equals(normalized);
    }

    private ValidatedUpload validate(
            MultipartFile file,
            String safeFileName,
            long maxSize,
            Set<String> allowedExtensions
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File exceeds the allowed size limit");
        }

        String extension = getExtension(safeFileName);
        if (!allowedExtensions.contains(extension)) {
            throw new IllegalArgumentException("File type '" + extension + "' is not allowed");
        }

        byte[] bytes = file.getBytes();
        if (bytes.length == 0) {
            throw new IllegalArgumentException("File is empty");
        }

        String detectedContentType = detectContentType(bytes, extension);
        return new ValidatedUpload(detectedContentType);
    }

    private String detectContentType(byte[] bytes, String extension) {
        return switch (extension) {
            case "jpg", "jpeg" -> require(matchesJpeg(bytes), "image/jpeg");
            case "png" -> require(matchesPng(bytes), "image/png");
            case "webp" -> require(matchesWebp(bytes), "image/webp");
            case "mp4" -> require(matchesMp4(bytes), "video/mp4");
            case "webm" -> require(matchesWebm(bytes), "video/webm");
            case "mov" -> require(matchesMp4(bytes), "video/quicktime");
            case "pdf" -> require(startsWith(bytes, new byte[]{0x25, 0x50, 0x44, 0x46}), "application/pdf");
            case "docx" -> require(matchesOfficeZip(bytes, "word/"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            case "xlsx" -> require(matchesOfficeZip(bytes, "xl/"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "doc" -> require(matchesOle(bytes), "application/msword");
            case "xls" -> require(matchesOle(bytes), "application/vnd.ms-excel");
            case "csv" -> require(matchesDelimitedText(bytes), "text/csv");
            case "txt" -> require(looksLikeText(bytes), "text/plain");
            default -> throw new IllegalArgumentException("Unsupported file type");
        };
    }

    private String detectImageContentType(byte[] bytes) {
        if (matchesJpeg(bytes)) {
            return "image/jpeg";
        }
        if (matchesPng(bytes)) {
            return "image/png";
        }
        if (matchesWebp(bytes)) {
            return "image/webp";
        }
        return null;
    }

    private String require(boolean condition, String contentType) {
        if (!condition) {
            throw new IllegalArgumentException("File content does not match the declared type");
        }
        return contentType;
    }

    private boolean matchesJpeg(byte[] bytes) {
        return bytes.length > 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF;
    }

    private boolean matchesPng(byte[] bytes) {
        return startsWith(bytes, new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
        });
    }

    private boolean matchesWebp(byte[] bytes) {
        return bytes.length > 12
                && bytes[0] == 'R'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == 'F'
                && bytes[8] == 'W'
                && bytes[9] == 'E'
                && bytes[10] == 'B'
                && bytes[11] == 'P';
    }

    private boolean matchesMp4(byte[] bytes) {
        return bytes.length > 11
                && bytes[4] == 'f'
                && bytes[5] == 't'
                && bytes[6] == 'y'
                && bytes[7] == 'p';
    }

    private boolean matchesWebm(byte[] bytes) {
        return startsWith(bytes, new byte[]{
                0x1A, 0x45, (byte) 0xDF, (byte) 0xA3
        });
    }

    private boolean matchesOle(byte[] bytes) {
        return startsWith(bytes, new byte[]{
                (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0,
                (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1
        });
    }

    private boolean matchesOfficeZip(byte[] bytes, String requiredPrefix) {
        if (!startsWith(bytes, new byte[]{0x50, 0x4B, 0x03, 0x04})) {
            return false;
        }

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            int inspected = 0;
            while ((entry = zis.getNextEntry()) != null && inspected < 64) {
                String name = entry.getName();
                if (name != null && name.startsWith(requiredPrefix)) {
                    return true;
                }
                inspected++;
            }
        } catch (IOException ignored) {
            return false;
        }

        return false;
    }

    private boolean matchesDelimitedText(byte[] bytes) {
        if (!looksLikeText(bytes)) {
            return false;
        }

        String sample = new String(bytes, 0, Math.min(bytes.length, 4096), StandardCharsets.UTF_8);
        return sample.contains(",") || sample.contains(";");
    }

    private boolean looksLikeText(byte[] bytes) {
        int sampleLength = Math.min(bytes.length, 4096);
        for (int i = 0; i < sampleLength; i++) {
            int value = bytes[i] & 0xFF;
            if (value == 0) {
                return false;
            }
            if (value < 0x20 && value != '\n' && value != '\r' && value != '\t') {
                return false;
            }
        }
        return true;
    }

    private boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (bytes[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private String getExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            throw new IllegalArgumentException("File extension is missing");
        }
        return fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }
}
