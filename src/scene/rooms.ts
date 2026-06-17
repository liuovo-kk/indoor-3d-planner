export interface RoomConfig {
  id: string;
  label: string;
  glbFile: string;
  position: [number, number, number];
  floor: string;
  floorLabel: string;
}

const LABEL = (name: string) => name.replace(/_/g, ' ');

const rooms: RoomConfig[] = [
  // -1F
  { id: 'Basement_props',      label: LABEL('Basement_props'),      glbFile: 'Basement_props.glb',      position: [0, -3, 0],     floor: '-1F', floorLabel: '负一楼' },

  // 1F
  { id: 'Bathroom_downstairs', label: LABEL('Bathroom_downstairs'), glbFile: 'Bathroom_downstairs.glb', position: [-12, 0, 6],    floor: '1F',  floorLabel: '一楼' },
  { id: 'Dining_room',         label: LABEL('Dining_room'),         glbFile: 'Dining_room.glb',         position: [8, 0, -4],     floor: '1F',  floorLabel: '一楼' },
  { id: 'Hallway_downstairs',  label: LABEL('Hallway_downstairs'),  glbFile: 'Hallway_downstairs.glb',  position: [6, 0, -3],     floor: '1F',  floorLabel: '一楼' },
  { id: 'Hallway_closetA',     label: LABEL('Hallway_closetA'),     glbFile: 'Hallway_closetA.glb',     position: [0, 0, 2],      floor: '1F',  floorLabel: '一楼' },
  { id: 'Hallway_closetB',     label: LABEL('Hallway_closetB'),     glbFile: 'Hallway_closetB.glb',     position: [0, 0, -2],     floor: '1F',  floorLabel: '一楼' },
  { id: 'Kitchen',             label: LABEL('Kitchen'),             glbFile: 'Kitchen.glb',             position: [1.5, 1.5, -7], floor: '1F',  floorLabel: '一楼' },
  { id: 'Living_room',         label: LABEL('Living_room'),         glbFile: 'Living_room.glb',         position: [8.5, 0, 1.5],  floor: '1F',  floorLabel: '一楼' },
  { id: 'TV_room',             label: LABEL('TV_room'),             glbFile: 'TV_room.glb',             position: [-10.5, 1, -1.5], floor: '1F', floorLabel: '一楼' },

  // 2F
  { id: 'Bathroom_upstairs',   label: LABEL('Bathroom_upstairs'),   glbFile: 'Bathroom_upstairs.glb',   position: [-2, 3, 4],     floor: '2F',  floorLabel: '二楼' },
  { id: 'Bedroom_girl',        label: LABEL('Bedroom_girl'),        glbFile: 'Bedroom_girl.glb',        position: [7, 3, 2],      floor: '2F',  floorLabel: '二楼' },
  { id: 'Bedroom_master',      label: LABEL('Bedroom_master'),      glbFile: 'Bedroom_master.glb',      position: [-10.5, 3, 4.5], floor: '2F', floorLabel: '二楼' },
  { id: 'Guest_room',          label: LABEL('Guest_room'),          glbFile: 'Guest_room.glb',          position: [7, 3, -4],     floor: '2F',  floorLabel: '二楼' },
  { id: 'Guest_room_closet',   label: LABEL('Guest_room_closet'),   glbFile: 'Guest_room_closet.glb',   position: [3, 3, -5.5],   floor: '2F',  floorLabel: '二楼' },
  { id: 'Hallway_upstairs',    label: LABEL('Hallway_upstairs'),    glbFile: 'Hallway_upstairs.glb',    position: [-6, 3, 0.5],   floor: '2F',  floorLabel: '二楼' },
  { id: 'Laundry_room',        label: LABEL('Laundry_room'),        glbFile: 'Laundry_room.glb',        position: [-2.5, 4, -5.5], floor: '2F', floorLabel: '二楼' },
  { id: 'Office_closetA',      label: LABEL('Office_closetA'),      glbFile: 'Office_closetA.glb',      position: [-12, 4, -4],   floor: '2F',  floorLabel: '二楼' },
  { id: 'Office_closetB',      label: LABEL('Office_closetB'),      glbFile: 'Office_closetB.glb',      position: [-9, 3, -4],    floor: '2F',  floorLabel: '二楼' },
  { id: 'Office',              label: LABEL('Office'),              glbFile: 'Office.glb',              position: [-11, 3, -1],   floor: '2F',  floorLabel: '二楼' },
];

export const DEFAULT_ROOM = 'Guest_room';
export const floorOrder = ['-1F', '1F', '2F'];

export function localToWorld(roomId: string, pos: [number, number, number]): [number, number, number] {
  const r = rooms.find((x) => x.id === roomId);
  return r
    ? [pos[0] + r.position[0], pos[1] + r.position[1], pos[2] + r.position[2]]
    : pos;
}

export function worldToLocal(roomId: string, pos: { x: number; y: number; z: number }): [number, number, number] {
  const r = rooms.find((x) => x.id === roomId);
  return r
    ? [pos.x - r.position[0], pos.y - r.position[1], pos.z - r.position[2]]
    : [pos.x, pos.y, pos.z];
}

export default rooms;
