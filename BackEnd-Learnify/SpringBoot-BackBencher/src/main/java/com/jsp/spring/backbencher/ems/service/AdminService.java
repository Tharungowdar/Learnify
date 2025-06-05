package com.jsp.spring.backbencher.ems.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jsp.spring.backbencher.ems.entity.PdfUpload;
import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.repository.PdfUploadRepository;
import com.jsp.spring.backbencher.ems.repository.UserRepository;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PdfUploadRepository pdfUploadRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<PdfUpload> getReportedContent() {
        return pdfUploadRepository.findByReportedTrue();
    }

    public void updateUserRole(Long id, String role) {
        User user = userRepository.findById(id).orElseThrow();
        userRepository.save(user);
    }

    public void approveContent(Long id) {
        PdfUpload pdf = pdfUploadRepository.findById(id).orElseThrow();
        pdf.setApproved(true);
        pdfUploadRepository.save(pdf);
    }

    public void rejectContent(Long id) {
        PdfUpload pdf = pdfUploadRepository.findById(id).orElseThrow();
        pdf.setApproved(false);
        pdfUploadRepository.save(pdf);
    }
}