import { Component, OnInit, OnDestroy } from '@angular/core';
import { timer, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { ScooterStatsService } from './services/scooter-stats.service';
import { ScooterStats } from './models/scooter-stats';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Website';

  scooterStats: ScooterStats;
  scooterStats$: Subscription;

  constructor (private scooterStatsService: ScooterStatsService) {
  }

  private startPollingForStats(): void {
    this.stopPollingForStats();
    this.scooterStats$ = timer(0, environment.statsPollingIntervalMs)
    .pipe(
      switchMap(() => this.scooterStatsService.getLatestStats()),
    )
    .subscribe(res => this.scooterStats = res);
  }

  private stopPollingForStats(): void {
    if (this.scooterStats$) {
      this.scooterStats$.unsubscribe();
    }
  }

  ngOnInit() {
   this.startPollingForStats();
  }

  ngOnDestroy() {
    this.stopPollingForStats();
  }
}
