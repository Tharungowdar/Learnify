package com.jsp.spring.backbencher.ems.controller;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.jsp.spring.backbencher.ems.entity.ProjectIdea;
import com.jsp.spring.backbencher.ems.service.ProjectIdeaService;

@RestController
@RequestMapping("/api/projects")
public class ProjectIdeaController {
	@Autowired
    private ProjectIdeaService service;

    @GetMapping
    public List<ProjectIdea> getAllProjects() {
        return service.suggestProjectsFlexible(List.of());
    }

    @PostMapping("/suggest")
    public List<ProjectIdea> suggestProjects(@RequestBody List<String> technologies) {
        return service.suggestProjectsFlexible(technologies);
    }

    @GetMapping("/{id}")
    public ProjectIdea getProject(@PathVariable Long id) {
        return service.getProjectIdea(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ProjectIdea addProject(@RequestBody ProjectIdea idea) {
        return service.addProject(idea);
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN')")
    public ProjectIdea importFromGithub(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        String[] parts = url.replace("https://github.com/", "").split("/");
        if (parts.length < 2) throw new IllegalArgumentException("Invalid GitHub URL");
        String owner = parts[0], repo = parts[1];

        RestTemplate rest = new RestTemplate();
        Map repoInfo = rest.getForObject(
            "https://api.github.com/repos/" + owner + "/" + repo, Map.class);
        Map topicsResp = rest.getForObject(
            "https://api.github.com/repos/" + owner + "/" + repo + "/topics", Map.class);

        String title = (String) repoInfo.get("name");
        String summary = (String) repoInfo.get("description");
        List<String> technologies = topicsResp.get("names") instanceof List ?
            (List<String>) topicsResp.get("names") : new ArrayList<>();

        String readmeApi = "https://raw.githubusercontent.com/" + owner + "/" + repo + "/main/README.md";
        String readme = "";
        try { readme = rest.getForObject(readmeApi, String.class); } catch (Exception ex) { }

        List<String> roadmap = new ArrayList<>();
        if (readme.contains("## Roadmap")) {
            String[] parts2 = readme.split("## Roadmap",2);
            String steps = parts2.length > 1 ? parts2[1] : "";
            Arrays.stream(steps.split("\\n"))
                .filter(line -> line.trim().startsWith("- ") || line.trim().startsWith("* "))
                .forEach(line -> roadmap.add(line.replaceFirst("[-*] ", "").trim()));
        }

        ProjectIdea idea = new ProjectIdea();
        idea.setTitle(title);
        idea.setSummary(summary != null ? summary : "Imported from GitHub");
        idea.setTechnologies(technologies);
        idea.setRoadmap(roadmap);
        idea.setExtraTechnologies(List.of());
        return service.addProject(idea);
    }

}
