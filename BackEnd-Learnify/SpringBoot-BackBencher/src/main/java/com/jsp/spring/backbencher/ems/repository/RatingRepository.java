package com.jsp.spring.backbencher.ems.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jsp.spring.backbencher.ems.entity.Article;
import com.jsp.spring.backbencher.ems.entity.PdfUpload;
import com.jsp.spring.backbencher.ems.entity.Rating;
import com.jsp.spring.backbencher.ems.entity.User;

public interface RatingRepository extends JpaRepository<Rating, Long> {

	List<Rating> findByPdf(PdfUpload pdf);

	Rating findByPdfAndUser(PdfUpload pdf, User user);

	Rating findByArticleAndUser(Article article, User user);

	List<Rating> findByArticle(Article article);

}
