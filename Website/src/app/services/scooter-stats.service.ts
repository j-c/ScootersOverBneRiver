import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ScooterStats } from '../models/scooter-stats';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const apiPath = 'GetLatestStats';
const apiEndpoint = environment.apiUrl + apiPath;

@Injectable({
  providedIn: 'root'
})
export class ScooterStatsService {

  private counter = 0;
  constructor(private httpClient: HttpClient) { }

  getLatestStats(): Observable<ScooterStats> {
    return this.httpClient.get<ScooterStats>(apiEndpoint);
  }
}
