package com.jsp.spring.backbencher.ems.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.jsp.spring.backbencher.ems.entity.Resource;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByLessonId(Long lessonId);
}