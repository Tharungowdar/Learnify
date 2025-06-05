package com.jsp.spring.backbencher.ems.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jsp.spring.backbencher.ems.entity.Article;
import com.jsp.spring.backbencher.ems.entity.PdfUpload;
import com.jsp.spring.backbencher.ems.repository.ArticleRepository;
import com.jsp.spring.backbencher.ems.repository.PdfUploadRepository;

@Service
public class SearchService {

    @Autowired
    private ArticleRepository articleRepository;

    @Autowired
    private PdfUploadRepository pdfUploadRepository;

    public List<Article> searchArticles(String query) {
        return articleRepository.fullTextSearch(query);
    }

    public List<PdfUpload> searchPdfs(String query) {
        return pdfUploadRepository.fullTextSearch(query);
    }
}