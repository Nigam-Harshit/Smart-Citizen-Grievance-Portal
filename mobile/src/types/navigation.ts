export type RootScreen = 
  | 'Splash'
  | 'Login'
  | 'Register'
  | 'Home'
  | 'SubmitGrievance'
  | 'MyGrievances'
  | 'GrievanceDetail'
  | 'Profile';

export interface GrievanceItem {
  id: string;
  title: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved';
  location: string;
  description: string;
  createdAt: string;
  deadline: string;
  assignedOfficer?: string;
}
