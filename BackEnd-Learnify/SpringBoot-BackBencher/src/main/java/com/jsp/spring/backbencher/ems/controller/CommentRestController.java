package com.jsp.spring.backbencher.ems.controller;

import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jsp.spring.backbencher.ems.entity.Article;
import com.jsp.spring.backbencher.ems.entity.Comment;
import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.service.ArticleService;
import com.jsp.spring.backbencher.ems.service.CommentService;
import com.jsp.spring.backbencher.ems.service.UserService;

@RestController
@RequestMapping("/api/comments")
public class CommentRestController {

    @Autowired
    private CommentService commentService;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private UserService userService;

    @PostMapping
    public ResponseEntity<Comment> addComment(@RequestParam Long articleId,
                                              @RequestParam String content,
                                              @RequestParam(required = false) Long parentCommentId,
                                              Principal principal) {
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Article article = articleService.getArticleById(articleId)
                .orElseThrow(() -> new IllegalArgumentException("Article not found"));

        Comment comment = new Comment();
        comment.setContent(content);
        comment.setAuthor(user);
        comment.setArticle(article);

        if (parentCommentId != null) {
            Comment parent = commentService.getCommentById(parentCommentId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            comment.setParentComment(parent);
        }

        Comment saved = commentService.saveComment(comment);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok().build();
    }
}