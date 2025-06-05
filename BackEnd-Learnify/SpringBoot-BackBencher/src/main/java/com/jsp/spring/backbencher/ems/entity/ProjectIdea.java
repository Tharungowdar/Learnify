package com.jsp.spring.backbencher.ems.entity;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ProjectIdea {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String title;

	@Column(length = 1000)
	private String summary;

	@ElementCollection
	private List<String> technologies;

	@ElementCollection
	private List<String> roadmap;

	@ElementCollection
	private List<String> extraTechnologies;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}

	public List<String> getTechnologies() {
		return technologies;
	}

	public void setTechnologies(List<String> technologies) {
		this.technologies = technologies;
	}

	public List<String> getRoadmap() {
		return roadmap;
	}

	public void setRoadmap(List<String> roadmap) {
		this.roadmap = roadmap;
	}

	public List<String> getExtraTechnologies() {
		return extraTechnologies;
	}

	public void setExtraTechnologies(List<String> extraTechnologies) {
		this.extraTechnologies = extraTechnologies;
	}
}
