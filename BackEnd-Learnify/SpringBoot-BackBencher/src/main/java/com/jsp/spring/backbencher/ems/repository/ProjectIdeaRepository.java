package com.jsp.spring.backbencher.ems.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.jsp.spring.backbencher.ems.entity.ProjectIdea;

public interface ProjectIdeaRepository extends JpaRepository<ProjectIdea, Long>{
	// Find projects where all required techs are in user's techs
    @Query("SELECT p FROM ProjectIdea p WHERE " +
           "(:techs) is null OR (SELECT COUNT(t) FROM ProjectIdea p2 JOIN p2.technologies t WHERE p2.id = p.id AND t NOT IN :techs) = 0")
    List<ProjectIdea> findByTechnologiesSubset(List<String> techs);
}
