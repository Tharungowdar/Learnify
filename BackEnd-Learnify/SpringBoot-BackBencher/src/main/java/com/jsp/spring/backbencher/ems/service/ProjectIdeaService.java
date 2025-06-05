package com.jsp.spring.backbencher.ems.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.jsp.spring.backbencher.ems.entity.ProjectIdea;
import com.jsp.spring.backbencher.ems.repository.ProjectIdeaRepository;

@Service
public class ProjectIdeaService {
	private final ProjectIdeaRepository repo;

    public ProjectIdeaService(ProjectIdeaRepository repo) {
        this.repo = repo;
    }

    public List<ProjectIdea> suggestProjectsFlexible(List<String> userTechs) {
        return repo.findAll().stream().map(p -> {
            List<String> missing = p.getTechnologies() == null ? List.of() :
                p.getTechnologies().stream().filter(t -> !userTechs.contains(t)).collect(Collectors.toList());
            ProjectIdea pi = new ProjectIdea();
            pi.setId(p.getId());
            pi.setTitle(p.getTitle());
            pi.setSummary(p.getSummary());
            pi.setTechnologies(p.getTechnologies());
            pi.setRoadmap(p.getRoadmap());
            pi.setExtraTechnologies(missing);
            return pi;
        }).filter(pi -> pi.getExtraTechnologies() == null ||
                pi.getExtraTechnologies().size() <= (pi.getTechnologies() == null ? 0 : pi.getTechnologies().size() * 0.4))
        .collect(Collectors.toList());
    }

    public ProjectIdea getProjectIdea(Long id) {
        return repo.findById(id).orElse(null);
    }

    public ProjectIdea addProject(ProjectIdea idea) {
        idea.setId(null);
        return repo.save(idea);
    }

}
