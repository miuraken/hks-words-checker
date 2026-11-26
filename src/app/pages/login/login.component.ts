import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <main class="login-page">
      <mat-card class="login-card" appearance="outlined">
        <mat-card-header>
          <div mat-card-avatar class="brand-avatar">
            <mat-icon>translate</mat-icon>
          </div>
          <mat-card-title>HSK 語彙特訓</mat-card-title>
          <mat-card-subtitle>声調 ＆ 聴解フラッシュカード</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="login-content">
          <div class="feature-item">
            <mat-icon color="primary">record_voice_over</mat-icon>
            <div>
              <strong>① 声調特訓モード</strong>
              <p>漢字を見てピンイン・声調を瞬時に思い浮かべる練習</p>
            </div>
          </div>
          <div class="feature-item">
            <mat-icon color="primary">hearing</mat-icon>
            <div>
              <strong>② 音→概念モード</strong>
              <p>音声とピンインから意味・漢字を即座に結びつける練習</p>
            </div>
          </div>
          <div class="feature-item">
            <mat-icon color="primary">event_repeat</mat-icon>
            <div>
              <strong>忘却曲線 ＆ 3回連続アーカイブ</strong>
              <p>あやふやな単語は自動で復習。スマホ・PCで同期</p>
            </div>
          </div>

          @if (errorMsg()) {
            <p class="error-text" role="alert">{{ errorMsg() }}</p>
          }
        </mat-card-content>

        <mat-card-actions class="login-actions">
          @if (!fb.authReady() || loading()) {
            <mat-spinner diameter="32" />
          } @else {
            <button
              mat-flat-button
              color="primary"
              class="google-btn"
              (click)="onGoogleLogin()"
            >
              <mat-icon>login</mat-icon>
              Google アカウントでログイン
            </button>
          }
        </mat-card-actions>
      </mat-card>
    </main>
  `,
  styles: `
    .login-page {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 8px;
      border-radius: 20px;
      background: var(--surface-bg);
    }
    .brand-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--btn-oboeta-bg);
      color: var(--btn-oboeta-fg);
      border-radius: 12px;
    }
    .login-content {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      p {
        margin: 2px 0 0;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }
    }
    .login-actions {
      padding: 16px;
      display: flex;
      justify-content: center;
    }
    .google-btn {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      border-radius: 24px;
    }
    .error-text {
      color: #ba1a1a;
      font-size: 0.875rem;
      margin: 0;
    }
  `,
})
export class LoginComponent {
  readonly fb = inject(FirebaseService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMsg = signal('');

  constructor() {
    effect(() => {
      if (this.fb.authReady() && this.fb.user()) {
        this.router.navigate(['/']);
      }
    });
  }

  async onGoogleLogin(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      await this.fb.signInWithGoogle();
    } catch {
      this.errorMsg.set('ログインに失敗しました。再度お試しください。');
    } finally {
      this.loading.set(false);
    }
  }
}
