import { ThreeEvent } from '@react-three/fiber';
import RoomBox from './RoomBox';

interface GuestRoomBoxProps {
  onFloorClick: (event: ThreeEvent<MouseEvent>) => void;
  glbUrl?: string;
}

export default function GuestRoomBox({ onFloorClick, glbUrl }: GuestRoomBoxProps) {
  return (
    <RoomBox
      onFloorClick={onFloorClick}
      glbUrl={glbUrl || '/models/GuestRoomBox.glb'}
    />
  );
}
