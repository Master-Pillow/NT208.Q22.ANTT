export interface Node {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  major: string;
  gpa: number;
  status: 'EXCELLENCE' | 'ON TRACK' | 'AT RISK' | 'WARNING';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  section: string;
  capacity: number;
  enrolled: number;
  room: string;
  schedule: string;
}
