import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export interface Ride {
  rideId: string;
  rideName: string;
  land: string;
  personCount: number;
  crowdLevel: string;
  estimatedWaitMinutes: number;
  lastUpdated: string;
}

export interface Message {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <!-- Navbar -->
      <header class="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">
            🏰
          </div>
          <span class="font-bold text-lg tracking-wide text-white">Disney Crowd Assistant</span>
          <span class="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">AWS CDS Hackathon MVP</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Rekognition + Bedrock AgentCore Active
        </div>
      </header>

      <!-- Main Dual Panel -->
      <main class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        <!-- Left: Admin Park Management -->
        <section class="lg:col-span-7 flex flex-col gap-6">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 class="text-base font-semibold text-white mb-1 flex items-center gap-2">
              <span>Admin Live Attraction Feed</span>
            </h2>
            <p class="text-xs text-slate-400 mb-5">Simulate camera inputs or manually override queue wait times in DynamoDB.</p>
            <div class="space-y-4">
              <div *ngFor="let ride of rides" class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-200">{{ ride.rideName }}</span>
                    <span [ngClass]="{
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30': ride.crowdLevel === 'LOW',
                      'bg-amber-500/20 text-amber-400 border-amber-500/30': ride.crowdLevel === 'MEDIUM',
                      'bg-red-500/20 text-red-400 border-red-500/30': ride.crowdLevel === 'HIGH'
                    }" class="text-[10px] px-2 py-0.5 rounded-full border font-semibold">
                      {{ ride.crowdLevel }} ({{ ride.estimatedWaitMinutes }}m)
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">Land: {{ ride.land }} | Headcount: {{ ride.personCount }}</p>
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto">
                  <button (click)="simulateSurge(ride, 55)" class="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 px-3 py-1.5 rounded-lg transition">
                    Surge (75m)
                  </button>
                  <button (click)="simulateDrop(ride, 12)" class="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 px-3 py-1.5 rounded-lg transition">
                    Clear (15m)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Camera Upload Simulator -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 class="text-sm font-semibold text-slate-200 mb-2">Simulate Rekognition Queue Analysis</h3>
            <p class="text-xs text-slate-400 mb-4">Upload a snapshot to execute Person Detection via Amazon Rekognition.</p>
            <input type="file" (change)="onFileSelected($event)" class="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 cursor-pointer"/>
          </div>
        </section>

        <!-- Right: Simulated Mobile WhatsApp Screen -->
        <section class="lg:col-span-5 flex flex-col items-center">
          <div class="w-full max-w-[380px] bg-slate-900 border-4 border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden h-[620px]">
            <!-- WhatsApp Top Bar -->
            <div class="bg-[#1f2c34] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-lg">
                  🏰
                </div>
                <div>
                  <div class="text-sm font-semibold text-slate-100 flex items-center gap-1">
                    Disney Assistant
                    <span class="text-emerald-400 text-xs">✓</span>
                  </div>
                  <div class="text-[10px] text-slate-400">AWS Bedrock & Social Messaging</div>
                </div>
              </div>
            </div>

            <!-- WhatsApp Message Bubble Container -->
            <div class="flex-1 bg-[#0b141a] p-4 overflow-y-auto space-y-3 text-xs">
              <div *ngFor="let msg of messages" [ngClass]="msg.sender === 'user' ? 'justify-end' : 'justify-start'" class="flex">
                <div [ngClass]="msg.sender === 'user' ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-slate-200 rounded-tl-none'" class="max-w-[85%] rounded-2xl p-3 shadow">
                  <p class="whitespace-pre-line leading-relaxed">{{ msg.text }}</p>
                  <span class="text-[9px] text-slate-400 block text-right mt-1">{{ msg.time }}</span>
                </div>
              </div>
            </div>

            <!-- WhatsApp Input -->
            <div class="bg-[#1f2c34] p-3 flex items-center gap-2 border-t border-slate-800">
              <input [(ngModel)]="inputQuery" (keyup.enter)="sendMessage()" placeholder="Ask about wait times..." class="flex-1 bg-[#2a3942] text-xs text-white placeholder-slate-400 px-3 py-2 rounded-xl border border-slate-700/60 focus:outline-none focus:border-emerald-500"/>
              <button (click)="sendMessage()" class="w-9 h-9 bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center text-white transition">
                ➤
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  `
})
export class AppComponent implements OnInit {
  rides: Ride[] = [
    { rideId: 'space_mountain', rideName: 'Space Mountain', land: 'Tomorrowland', personCount: 52, crowdLevel: 'HIGH', estimatedWaitMinutes: 75, lastUpdated: new Date().toISOString() },
    { rideId: 'star_tours', rideName: 'Star Tours', land: 'Tomorrowland', personCount: 14, crowdLevel: 'LOW', estimatedWaitMinutes: 15, lastUpdated: new Date().toISOString() },
    { rideId: 'pirates_caribbean', rideName: 'Pirates of the Caribbean', land: 'New Orleans Square', personCount: 22, crowdLevel: 'MEDIUM', estimatedWaitMinutes: 25, lastUpdated: new Date().toISOString() }
  ];

  messages: Message[] = [
    { sender: 'assistant', text: '👋 Hi! Welcome to Disneyland! Ask me any wait time or request an alert when crowds clear out.', time: '11:20 AM' }
  ];

  inputQuery = '';
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchRides();
  }

  fetchRides() {
    this.http.get<Ride[]>(`${this.apiUrl}/rides`).subscribe({
      next: (data) => { if (data && data.length) this.rides = data; },
      error: () => { /* Fallback to local state if backend offline */ }
    });
  }

  simulateSurge(ride: Ride, count: number) {
    ride.personCount = count;
    ride.estimatedWaitMinutes = 75;
    ride.crowdLevel = 'HIGH';
    this.http.post(`${this.apiUrl}/rides`, ride).subscribe();
  }

  simulateDrop(ride: Ride, count: number) {
    ride.personCount = count;
    ride.estimatedWaitMinutes = 15;
    ride.crowdLevel = 'LOW';
    this.http.post(`${this.apiUrl}/rides`, ride).subscribe();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      this.http.post<Ride>(`${this.apiUrl}/rides/analyze-feed/space_mountain`, formData).subscribe(res => {
        const idx = this.rides.findIndex(r => r.rideId === res.rideId);
        if (idx !== -1) this.rides[idx] = res;
      });
    }
  }

  sendMessage() {
    if (!this.inputQuery.trim()) return;
    const text = this.inputQuery;
    this.messages.push({ sender: 'user', text, time: '11:24 AM' });
    this.inputQuery = '';

    this.http.post<{ assistantReply: string }>(`${this.apiUrl}/chat`, {
      sessionId: 'session-demo',
      userMessage: text,
      phoneNumber: '+1234567890'
    }).subscribe({
      next: (res) => {
        this.messages.push({ sender: 'assistant', text: res.assistantReply, time: '11:24 AM' });
      },
      error: () => {
        setTimeout(() => {
          this.messages.push({
            sender: 'assistant',
            text: '🚀 *Space Mountain* is currently packed (75m wait)!\n\n💡 *Tip*: Star Tours is right nearby with only a 15-minute queue! Would you like an alert when Space Mountain drops under 30 minutes?',
            time: '11:24 AM'
          });
        }, 500);
      }
    });
  }
}
