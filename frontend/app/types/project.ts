import { Project } from './scene';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
}

export interface ProjectWithScene extends Project {
  owner: User;
}
