package com.jsp.spring.backbencher.ems.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jsp.spring.backbencher.ems.entity.Article;
import com.jsp.spring.backbencher.ems.entity.PdfUpload;
import com.jsp.spring.backbencher.ems.entity.Rating;
import com.jsp.spring.backbencher.ems.entity.User;
import com.jsp.spring.backbencher.ems.repository.ArticleRepository;
import com.jsp.spring.backbencher.ems.repository.PdfUploadRepository;
import com.jsp.spring.backbencher.ems.repository.RatingRepository;
import com.jsp.spring.backbencher.ems.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class RatingService {

	@Autowired
	private RatingRepository ratingRepository;

	@Autowired
	private PdfUploadRepository pdfUploadRepository;

	@Autowired
	private ArticleRepository articleRepository;

	@Autowired
	private UserRepository userRepository;

	@Transactional
	public void ratePdf(Long pdfId, Long userId, int ratingValue) {
		// Validate rating value (1-5)
		ratingValue = Math.max(1, Math.min(5, ratingValue));

		PdfUpload pdf = pdfUploadRepository.findById(pdfId).orElseThrow();
		User user = userRepository.findById(userId).orElseThrow();

		// Check if user already rated
		Rating existingRating = ratingRepository.findByPdfAndUser(pdf, user);

		if (existingRating != null) {
			// Update existing rating
			existingRating.setValue(ratingValue);
			ratingRepository.save(existingRating);
		} else {
			// Create new rating
			Rating rating = new Rating();
			rating.setPdf(pdf);
			rating.setUser(user);
			rating.setValue(ratingValue);
			ratingRepository.save(rating);
		}

		// Update PDF rating stats
		updatePdfRatingStats(pdf);
	}

	@Transactional
	public void rateArticle(Long articleId, Long userId, int ratingValue) {
		ratingValue = Math.max(1, Math.min(5, ratingValue));
		Article article = articleRepository.findById(articleId).orElseThrow();
		User user = userRepository.findById(userId).orElseThrow();

		// Check if user already rated
		Rating existingRating = ratingRepository.findByArticleAndUser(article, user);

		if (existingRating != null) {
			existingRating.setValue(ratingValue);
			ratingRepository.save(existingRating);
		} else {
			Rating rating = new Rating();
			rating.setArticle(article);
			rating.setUser(user);
			rating.setValue(ratingValue);
			ratingRepository.save(rating);
			updateArticleRatingStats(article);
		}
	}

	private void updateArticleRatingStats(Article article) {
		List<Rating> ratings = ratingRepository.findByArticle(article);
		double sum = ratings.stream().mapToInt(Rating::getValue).sum();
		double average = ratings.isEmpty() ? 0 : sum / ratings.size();

		article.setAverageRating(average);
		article.setVoteCount(ratings.size());
		articleRepository.save(article);
	}

	private void updatePdfRatingStats(PdfUpload pdf) {
		List<Rating> ratings = ratingRepository.findByPdf(pdf);
		double sum = ratings.stream().mapToInt(Rating::getValue).sum();
		double average = sum / ratings.size();

		pdf.setAverageRating(average);
		pdf.setVoteCount(ratings.size());
		pdfUploadRepository.save(pdf);
	}
}