import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'study/:mode/:level',
    loadComponent: () =>
      import('./pages/study/study.component').then((m) => m.StudyComponent),
  },
  {
    path: 'words/:mode/:level',
    loadComponent: () =>
      import('./pages/words/words.component').then((m) => m.WordsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
