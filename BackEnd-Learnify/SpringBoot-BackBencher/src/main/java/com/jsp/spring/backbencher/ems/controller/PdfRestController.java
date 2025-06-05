package com.jsp.spring.backbencher.ems.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.jsp.spring.backbencher.ems.entity.PdfUpload;
import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.repository.PdfUploadRepository;
import com.jsp.spring.backbencher.ems.repository.UserRepository;
import com.jsp.spring.backbencher.ems.service.CourseService;
import com.jsp.spring.backbencher.ems.service.PdfService;
import com.jsp.spring.backbencher.ems.service.RatingService;
import com.jsp.spring.backbencher.ems.service.UserService;

@RestController
@RequestMapping("/api/pdf")
public class PdfRestController {

    @Autowired
    private PdfService pdfService;

    @Autowired
    private RatingService ratingService;

    @Autowired
    private UserService userService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PdfUploadRepository pdfUploadRepository;

    // Define your upload directory (update as needed)
    private final String uploadDir = "uploads";

    private static class ErrorResponse {
        private String message;

        public ErrorResponse(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }

    @GetMapping("/file/{id}")
    public ResponseEntity<?> servePdfFile(@PathVariable Long id) throws IOException {
        PdfUpload pdf = pdfUploadRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("PDF not found"));
        Path filePath = Paths.get(uploadDir).resolve(Paths.get(pdf.getFilePath()).getFileName().toString());
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
            .header("Content-Type", "application/pdf")
            .header("Content-Disposition", "inline; filename=\"" + pdf.getFileName() + "\"")
            .body(Files.readAllBytes(filePath));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long courseId,
            Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("User not authenticated"));
            }

            String username = principal.getName();
            User user = userService.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

            PdfUpload pdfUpload = pdfService.processPdfUpload(file, user.getId(), courseId);
            return ResponseEntity.ok(pdfUpload);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    private Long getCurrentUserId(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<?> ratePdf(@PathVariable Long id,
                                     @RequestParam int ratingValue,
                                     Principal principal) {
        ratingService.ratePdf(id, getCurrentUserId(principal), ratingValue);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<PdfUpload>> getAllPdfs() {
        try {
            List<PdfUpload> pdfs = pdfUploadRepository.findAll();
            return ResponseEntity.ok(pdfs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
