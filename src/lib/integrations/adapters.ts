/**
 * Integration boundaries. StageFlow is designed to COMPLEMENT existing systems
 * (e.g. Yesplan for venue/event planning) – not replace them.
 *
 * Nothing here talks to a real external system. The only implementation is an
 * explicit, clearly-labelled mock. A production adapter must be built against
 * the vendor's documented API and the theatre's actual configuration, after
 * verifying access, data ownership and a data processing agreement.
 */
import type { ID, Room } from "../types";

export interface ExternalBooking {
  externalId: string;
  source: "yesplan" | "mock";
  title: string;
  roomName: string;
  start: string;
  end: string;
}

export interface VenuePlanningAdapter {
  readonly id: string;
  readonly label: string;
  readonly isMock: boolean;
  /** Read-only import of bookings in a window, used for conflict detection. */
  listBookings(fromISO: string, toISO: string): Promise<ExternalBooking[]>;
  /** Map an external room/space name to a StageFlow room id (configurable). */
  mapRoom(externalName: string, rooms: Room[]): ID | undefined;
}

/** Explicitly a mock – returns fictional bookings and says so. */
export class MockVenueAdapter implements VenuePlanningAdapter {
  readonly id = "mock-venue";
  readonly label = "Mock (fiktiva bokningar)";
  readonly isMock = true;
  async listBookings(fromISO: string, _toISO?: string): Promise<ExternalBooking[]> {
    const day = fromISO.slice(0, 10);
    return [
      { externalId: "MOCK-1", source: "mock", title: "Extern uthyrning: konferens", roomName: "Hörsalen", start: `${day}T08:00`, end: `${day}T12:00` },
      { externalId: "MOCK-2", source: "mock", title: "Visning för skolklass", roomName: "Stora scenen", start: `${day}T13:00`, end: `${day}T14:30` },
    ];
  }
  mapRoom(externalName: string, rooms: Room[]) {
    return rooms.find((r) => r.name.toLowerCase() === externalName.toLowerCase())?.id;
  }
}

/** Notification channels – in-app is implemented; others are future adapters. */
export interface NotificationChannel {
  readonly id: "in-app" | "email" | "sms" | "push";
  readonly implemented: boolean;
  send(recipientId: ID, subject: string, body: string): Promise<void>;
}
