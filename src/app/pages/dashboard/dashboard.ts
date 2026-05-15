import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DatesSetArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { catchError, forkJoin, of } from 'rxjs';
import { Auth } from '../../services/auth';

interface UserSubscription {
  id_user_subscription: number;
  id_user: number;
  id_subscription: number;
  id_currency: number;
  frecuency: string;
  day_number: number;
  amount: number | string;
}

interface UserEarning {
  id_user_earning?: number;
  id_earning?: number;
  id?: number;
  title?: string;
  description?: string;
  amount?: number | string;
  start?: string;
  date?: string;
  earning_date?: string;
  day_number?: number;
}

interface UserDiary {
  id_user_diary?: number;
  id_diary?: number;
  id?: number;
  title?: string;
  description?: string;
  note?: string;
  start?: string;
  date?: string;
  diary_date?: string;
  day_number?: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [FullCalendarModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, AfterViewInit {
  @ViewChild(FullCalendarComponent) calendarComponent?: FullCalendarComponent;

  private readonly subscriptionsUrl = '/api/user-subscription';
  private readonly earningsUrl = '/api/user-earning';
  private readonly diaryUrl = '/api/user-diary';
  private subscriptions: UserSubscription[] = [];
  private earnings: UserEarning[] = [];
  private diaryEntries: UserDiary[] = [];
  private visibleMonth = new Date();
  private calendarReady = false;
  totalEarnings = 0;
  subscriptionsCount = 0;
  balance = 0;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'today'
    },
    buttonText: {
      today: 'Today'
    },
    datesSet: (dateInfo) => this.handleDatesSet(dateInfo),
    events: []
  };

  constructor(
    public auth: Auth,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    forkJoin({
      subscriptions: this.http
        .get<UserSubscription[]>(this.subscriptionsUrl)
        .pipe(catchError(() => of([]))),
      earnings: this.http
        .get<UserEarning[]>(this.earningsUrl)
        .pipe(catchError(() => of([]))),
      diaryEntries: this.http
        .get<UserDiary[]>(this.diaryUrl)
        .pipe(catchError(() => of([])))
    }).subscribe(({ subscriptions, earnings, diaryEntries }) => {
      this.subscriptions = subscriptions;
      this.earnings = earnings;
      this.diaryEntries = diaryEntries;
      this.syncCalendarEvents();
    });
  }

  ngAfterViewInit() {
    this.calendarReady = true;
    this.syncCalendarEvents();
  }

  private handleDatesSet(dateInfo: DatesSetArg) {
    this.visibleMonth = dateInfo.view.currentStart;
    this.syncCalendarEvents();
  }

  private syncCalendarEvents() {
    this.updateMetrics();
    this.cdr.detectChanges();

    if (!this.calendarReady || !this.calendarComponent) {
      return;
    }

    const calendarApi = this.calendarComponent.getApi();
    const events = this.buildCalendarEvents(this.visibleMonth);

    calendarApi.removeAllEvents();
    calendarApi.addEventSource(events);
  }

  private buildCalendarEvents(monthDate: Date): EventInput[] {
    return [
      ...this.buildSubscriptionEvents(monthDate),
      ...this.buildEarningEvents(monthDate),
      ...this.buildDiaryEvents(monthDate)
    ];
  }

  private updateMetrics() {
    // console.log('Updating metrics for visible month:', this.getVisibleMonthEarnings());

    this.totalEarnings = this.getVisibleMonthEarnings().reduce(
      (total, earning) => total + this.toNumber(earning.amount),
      0
    );
    this.subscriptionsCount = this.subscriptions.length;
    this.balance = this.totalEarnings - this.getVisibleMonthSubscriptionTotal();
  }

  private getVisibleMonthEarnings() {
    return this.earnings.filter((earning) => {
      const date = this.resolveEventDate(this.visibleMonth, [
        earning.start,
        earning.date,
        earning.earning_date
      ], earning.day_number);

      return date ? this.isSameMonth(date, this.visibleMonth) : false;
    });
  }

  private getVisibleMonthSubscriptionTotal() {
    return this.subscriptions
      .filter((subscription) => subscription.frecuency === 'monthly')
      .reduce((total, subscription) => total + this.toNumber(subscription.amount), 0);
  }

  private buildSubscriptionEvents(monthDate: Date): EventInput[] {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    return this.subscriptions
      .filter((subscription) => subscription.frecuency === 'monthly')
      .map((subscription) => {
        const day = Math.min(subscription.day_number, lastDay);
        const date = new Date(year, month, day);

        return {
          id: String(subscription.id_user_subscription),
          title: `Subscription #${subscription.id_subscription} - $${subscription.amount}`,
          start: this.formatDate(date),
          className: 'subscription-event'
        };
      });
  }

  private buildEarningEvents(monthDate: Date): EventInput[] {
    const events: EventInput[] = [];

    for (const earning of this.earnings) {
      const date = this.resolveEventDate(monthDate, [
        earning.start,
        earning.date,
        earning.earning_date
      ], earning.day_number);

      if (!date || !this.isSameMonth(date, monthDate)) {
        continue;
      }

      events.push({
        id: `earning-${earning.id_user_earning ?? earning.id_earning ?? earning.id ?? this.formatDate(date)}`,
        title: earning.title ?? `Earning${earning.amount ? ` - $${earning.amount}` : ''}`,
        start: this.formatDate(date),
        className: 'earning-event'
      });
    }

    return events;
  }

  private buildDiaryEvents(monthDate: Date): EventInput[] {
    const events: EventInput[] = [];

    for (const entry of this.diaryEntries) {
      const date = this.resolveEventDate(monthDate, [
        entry.start,
        entry.date,
        entry.diary_date
      ], entry.day_number);

      if (!date || !this.isSameMonth(date, monthDate)) {
        continue;
      }

      events.push({
        id: `diary-${entry.id_user_diary ?? entry.id_diary ?? entry.id ?? this.formatDate(date)}`,
        title: entry.title ?? entry.description ?? entry.note ?? 'Diary entry',
        start: this.formatDate(date),
        className: 'diary-event'
      });
    }

    return events;
  }

  private resolveEventDate(monthDate: Date, dateValues: Array<string | undefined>, dayNumber?: number) {
    const dateValue = dateValues.find(Boolean);

    if (dateValue) {
      return this.parseDate(dateValue);
    }

    if (!dayNumber) {
      return null;
    }

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    return new Date(year, month, Math.min(dayNumber, lastDay));
  }

  private parseDate(value: string) {
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  private isSameMonth(date: Date, monthDate: Date) {
    return (
      date.getFullYear() === monthDate.getFullYear() &&
      date.getMonth() === monthDate.getMonth()
    );
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toNumber(value: number | string | undefined) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}
