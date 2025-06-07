package com.jsp.spring.backbencher.ems.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jsp.spring.backbencher.ems.service.AdminService;
import com.jsp.spring.backbencher.ems.service.CourseService;
import com.jsp.spring.backbencher.ems.service.UserService;

@RestController
@RequestMapping("/api/admin")
public class AdminRestController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/dashboard")
    public Map<String, Object> adminDashboard() {
        Map<String, Object> data = new HashMap<>();
        data.put("users", adminService.getAllUsers());
        data.put("reportedContent", adminService.getReportedContent());
        return data;
    }

    @PutMapping("/user/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestParam String role) {
        adminService.updateUserRole(id, role);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/content/{id}/approve")
    public ResponseEntity<?> approveContent(@PathVariable Long id) {
        adminService.approveContent(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/content/{id}/reject")
    public ResponseEntity<?> rejectContent(@PathVariable Long id) {
        adminService.rejectContent(id);
        return ResponseEntity.ok().build();
    }
    
    @Autowired
    private UserService userService;

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUserByAdmin(@PathVariable Long id) {
        // Optionally add an admin check here!
        userService.deleteUser(id);
        return ResponseEntity.ok().body("User deleted successfully");
    }
    
    @Autowired
    private CourseService courseService;

    

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourseByAdmin(@PathVariable Long id) {
        // TODO: Add admin role check for production!
        courseService.deleteCourse(id);
        return ResponseEntity.ok().body("Course deleted successfully");
    }
}