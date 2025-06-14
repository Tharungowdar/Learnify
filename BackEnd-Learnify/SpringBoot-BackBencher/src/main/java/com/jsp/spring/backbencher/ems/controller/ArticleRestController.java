package com.jsp.spring.backbencher.ems.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jsp.spring.backbencher.ems.entity.Article;
import com.jsp.spring.backbencher.ems.entity.Course;
import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.service.ArticleService;
import com.jsp.spring.backbencher.ems.service.CourseService;
import com.jsp.spring.backbencher.ems.service.UserService;

@RestController
@RequestMapping("/api/articles")
public class ArticleRestController {

    @Autowired
    private ArticleService articleService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private UserService userService;

    @GetMapping
    public List<Article> listArticles() {
        return articleService.getAllArticles();
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Article> editArticle(@PathVariable Long id,
                                               @RequestBody Map<String, Object> payload,
                                               Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(null);
        }
        Article existing = articleService.getArticleById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid article Id:" + id));

        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        Long courseId = Long.parseLong(payload.get("courseId").toString());
        List<Long> references = payload.get("references") == null ? List.of() :
            ((List<?>) payload.get("references")).stream()
                .map(Object::toString)
                .map(Long::parseLong)
                .collect(Collectors.toList());

        existing.setTitle(title);
        existing.setContent(content);
        existing.setReferences(references);
        Course course = courseService.getCourseById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        existing.setCourse(course);

        Article saved = articleService.saveArticle(existing);
        return ResponseEntity.ok(saved);
    }


    @GetMapping("/{id}")
    public ResponseEntity<Article> getArticle(@PathVariable Long id) {
        return articleService.getArticleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/lookup")
    public List<Map<String, Object>> lookupArticles() {
        return articleService.getAllArticles().stream()
            .map(a -> {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", a.getId());
                map.put("title", a.getTitle());
                return map;
            })
            .collect(Collectors.toList());
    }

    private static class ErrorResponse {
        private String message;
        
        public ErrorResponse(String message) {
            this.message = message;
        }
        
        public String getMessage() {
            return message;
        }
    }

    @PostMapping
    public ResponseEntity<?> addArticle(@RequestBody Map<String, Object> payload,
                                      Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("User not authenticated"));
            }
            
            String title = (String) payload.get("title");
            String content = (String) payload.get("content");
            Long courseId = Long.parseLong(payload.get("courseId").toString());
            
            String username = principal.getName();
            User user = userService.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
            
            Course course = courseService.getCourseById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Course not found"));
                        Article article = new Article();
            article.setTitle(title);
            article.setContent(content);
            article.setAuthor(user);
            article.setCourse(course);
            
            Article saved = articleService.saveArticle(article);
            return ResponseEntity.ok(saved);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteArticle(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        articleService.deleteArticle(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public List<Article> searchArticles(@RequestParam String query) {
        return articleService.searchArticles(query);
    }
}
