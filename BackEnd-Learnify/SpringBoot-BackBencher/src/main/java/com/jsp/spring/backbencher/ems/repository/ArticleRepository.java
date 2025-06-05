package com.jsp.spring.backbencher.ems.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.jsp.spring.backbencher.ems.entity.Article;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {

    @Query(value = "SELECT * FROM articles WHERE MATCH(title, content) AGAINST(:query IN BOOLEAN MODE)", nativeQuery = true)
    List<Article> fullTextSearch(@Param("query") String query);
}