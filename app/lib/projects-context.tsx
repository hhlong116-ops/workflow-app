"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Project = {
  id: string;
  name: string;
  agent: string;
  status: "Product" | "Finance" | "Contracting" | "Completed";
  deadline: string;
  progress: string;
  description: string;
};

type ProjectsContextType = {
  projects: Project[];
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  getProjectById: (id: string) => Project | undefined;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

const initialProjects: Project[] = [
  {
    id: "p1",
    name: "Japan Tour 2026",
    agent: "Wendy Wu",
    status: "Finance",
    deadline: "28 May 2026",
    progress: "62%",
    description: "Finalize budgets, hotel contracts, and local transport arrangements.",
  },
  {
    id: "p2",
    name: "School Trip UK",
    agent: "WOC",
    status: "Contracting",
    deadline: "30 May 2026",
    progress: "45%",
    description: "Booking and contract finalization for group travel packages.",
  },
  {
    id: "p3",
    name: "Europe Package",
    agent: "Distant Journeys",
    status: "Completed",
    deadline: "05 Jun 2026",
    progress: "100%",
    description: "Completed multi-country tour package for summer season.",
  },
  {
    id: "p4",
    name: "Sydney Launch",
    agent: "Wendy Wu",
    status: "Product",
    deadline: "12 Jun 2026",
    progress: "78%",
    description: "Coordinate launch event logistics and promotional campaigns.",
  },
];

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const addProject = (project: Omit<Project, "id">) => {
    const newId = `p${projects.length + 1}`;
    setProjects([...projects, { ...project, id: newId }]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const getProjectById = (id: string) => {
    return projects.find((p) => p.id === id);
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, getProjectById }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
