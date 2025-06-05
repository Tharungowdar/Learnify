package com.jsp.spring.backbencher.ems.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jsp.spring.backbencher.ems.entity.Lesson;
import com.jsp.spring.backbencher.ems.entity.Resource;
import com.jsp.spring.backbencher.ems.service.LessonService;
import com.jsp.spring.backbencher.ems.service.ResourceService;

@RestController
@RequestMapping("/api/resources")
public class ResourceRestController {

    @Autowired
    private ResourceService resourceService;

    @Autowired
    private LessonService lessonService;

    @GetMapping("/lesson/{lessonId}")
    public List<Resource> listResources(@PathVariable Long lessonId) {
        return resourceService.getResourcesByLesson(lessonId);
    }

    @PostMapping("/lesson/{lessonId}")
    public ResponseEntity<Resource> addResource(@PathVariable Long lessonId, @RequestBody Resource resource) {
        Lesson lesson = lessonService.getLessonById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        resource.setLesson(lesson);
        Resource saved = resourceService.saveResource(resource);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resource> editResource(@PathVariable Long id, @RequestBody Resource resource) {
        Resource existing = resourceService.getResourceById(id)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found"));
        resource.setId(id);
        resource.setLesson(existing.getLesson());
        Resource saved = resourceService.saveResource(resource);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.ok().build();
    }
}