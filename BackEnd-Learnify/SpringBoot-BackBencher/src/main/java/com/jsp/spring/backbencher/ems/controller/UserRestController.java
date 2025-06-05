package com.jsp.spring.backbencher.ems.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserRestController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        if (userService.emailExists(user.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        if (userService.usernameExists(user.getUsername())) {
            return ResponseEntity.badRequest().body("Username already taken");
        }
        userService.registerUser(user);
        return ResponseEntity.ok().build();
    }
}