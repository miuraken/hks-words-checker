import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="app-container"><router-outlet /></div>`,
})
export class App {
  // アプリ起動時に window.matchMedia のダークモード監視を開始
  private readonly _theme = inject(ThemeService);
}
