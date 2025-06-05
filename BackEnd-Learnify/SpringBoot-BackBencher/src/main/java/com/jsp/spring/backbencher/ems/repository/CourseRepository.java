package com.jsp.spring.backbencher.ems.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.jsp.spring.backbencher.ems.entity.Course;

public interface CourseRepository extends JpaRepository<Course, Long> {

}