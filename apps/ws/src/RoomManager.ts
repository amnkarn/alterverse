import { OutgoingMessage } from "./types.js";
import { User } from "./user.js";


export class RoomManager {
    rooms: Map<string, User[]> = new Map(); //created a room map that have User array
    static instanse: RoomManager;

    private constructor() {
        this.rooms = new Map();
    }

    static getInstance() {
        if(!this.instanse) {
            this.instanse = new RoomManager();
        }
        return this.instanse;
    }

    public addUser(spaceId: string, user: User) {
        if(!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user]);
            return;
        }

        this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);
    }

    public removeUser(user: User, spaceId: string) {
        if(!this.rooms.has(spaceId)) {
            return;
        }
        
        const room = this.rooms.get(spaceId);

        this.rooms.set(spaceId, room!.filter((u) => u.id !== user.id));
    }

    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
        if(!this.rooms.has(roomId)) {
            return;
        }

        this.rooms.get(roomId)?.forEach((e) => {
            if(e.id !== user.id) {
                e.send(message);
            }
        })
    }
}