package com.jsp.spring.backbencher.ems.controller;

import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.repository.UserRepository;
import com.jsp.spring.backbencher.ems.service.RatingService;

@RestController
@RequestMapping("/api/ratings")
public class RatingRestController {

    @Autowired
    private RatingService ratingService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/pdf/{pdfId}")
    public ResponseEntity<?> ratePdf(@PathVariable Long pdfId,
                                     @RequestParam int value,
                                     Principal principal) {
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ratingService.ratePdf(pdfId, user.getId(), value);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/article/{articleId}")
    public ResponseEntity<?> rateArticle(@PathVariable Long articleId,
                                         @RequestParam int value,
                                         Principal principal) {
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ratingService.rateArticle(articleId, user.getId(), value);
        return ResponseEntity.ok().build();
    }
}