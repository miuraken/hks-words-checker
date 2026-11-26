import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

export const authGuard: CanActivateFn = async () => {
  const fb = inject(FirebaseService);
  const router = inject(Router);

  // authReady が true になるまで待機
  while (!fb.authReady()) {
    await new Promise((r) => setTimeout(r, 30));
  }

  if (fb.user()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
