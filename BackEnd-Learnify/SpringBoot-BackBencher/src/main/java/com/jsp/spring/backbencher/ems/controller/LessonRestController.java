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

import com.jsp.spring.backbencher.ems.entity.Course;
import com.jsp.spring.backbencher.ems.entity.Lesson;
import com.jsp.spring.backbencher.ems.service.CourseService;
import com.jsp.spring.backbencher.ems.service.LessonService;

@RestController
@RequestMapping("/api/lessons")
public class LessonRestController {

    @Autowired
    private LessonService lessonService;

    @Autowired
    private CourseService courseService;

    @GetMapping("/course/{courseId}")
    public List<Lesson> listLessons(@PathVariable Long courseId) {
        return lessonService.getLessonsByCourse(courseId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Lesson> getLesson(@PathVariable Long id) {
        return lessonService.getLessonById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/course/{courseId}")
    public ResponseEntity<Lesson> addLesson(@PathVariable Long courseId, @RequestBody Lesson lesson) {
        Course course = courseService.getCourseById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        lesson.setCourse(course);
        Lesson saved = lessonService.saveLesson(lesson);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Lesson> editLesson(@PathVariable Long id, @RequestBody Lesson lesson) {
        Lesson existing = lessonService.getLessonById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        lesson.setId(id);
        lesson.setCourse(existing.getCourse());
        Lesson saved = lessonService.saveLesson(lesson);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLesson(@PathVariable Long id) {
        lessonService.deleteLesson(id);
        return ResponseEntity.ok().build();
    }
}