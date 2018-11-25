import { TestBed } from '@angular/core/testing';

import { ScooterStatsService } from './scooter-stats.service';

describe('ScooterStatsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ScooterStatsService = TestBed.get(ScooterStatsService);
    expect(service).toBeTruthy();
  });
});
