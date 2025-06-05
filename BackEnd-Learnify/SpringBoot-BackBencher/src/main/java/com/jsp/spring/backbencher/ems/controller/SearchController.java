package com.jsp.spring.backbencher.ems.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.jsp.spring.backbencher.ems.service.SearchService;

@Controller
public class SearchController {

    @Autowired
    private SearchService searchService;

    @GetMapping("/search")
    public String search(@RequestParam String query, Model model) {
        model.addAttribute("articles", searchService.searchArticles(query));
        model.addAttribute("pdfs", searchService.searchPdfs(query));
        model.addAttribute("query", query);
        return "search/results";
    }
}