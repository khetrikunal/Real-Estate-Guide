package com.real_estate.Kunal.Security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ChatFileUploadSecurityValidatorTest {

    private final FileUploadSecurityValidator validator = new FileUploadSecurityValidator();

    @Test
    void chatAttachmentsAcceptSafeBrowserVideoTypes() throws Exception {
        MockMultipartFile mp4 = new MockMultipartFile(
                "file",
                "tour.mp4",
                "video/mp4",
                new byte[]{0, 0, 0, 24, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'}
        );
        MockMultipartFile webm = new MockMultipartFile(
                "file",
                "walkthrough.webm",
                "video/webm",
                new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0x42, (byte) 0x86}
        );

        assertThat(validator.validateChatAttachment(mp4, "tour.mp4").contentType())
                .isEqualTo("video/mp4");
        assertThat(validator.validateChatAttachment(webm, "walkthrough.webm").contentType())
                .isEqualTo("video/webm");
    }

    @Test
    void chatAttachmentsAcceptPlainTextDocumentsFromBrowserPicker() throws Exception {
        MockMultipartFile text = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "Inspection notes".getBytes(StandardCharsets.UTF_8)
        );

        assertThat(validator.validateChatAttachment(text, "notes.txt").contentType())
                .isEqualTo("text/plain");
    }

    @Test
    void projectCoverImagesUseDetectedImageContentTypeWhenExtensionIsMisleading() throws Exception {
        MockMultipartFile pngNamedAsJpg = new MockMultipartFile(
                "file",
                "cover.jpg",
                "image/jpeg",
                new byte[]{
                        (byte) 0x89, 0x50, 0x4E, 0x47,
                        0x0D, 0x0A, 0x1A, 0x0A,
                        0x00, 0x00, 0x00, 0x0D
                }
        );

        assertThat(validator.validateProjectImage(pngNamedAsJpg, "cover.jpg").contentType())
                .isEqualTo("image/png");
    }
}
