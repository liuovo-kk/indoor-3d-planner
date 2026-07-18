import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import collabClient from '../api/collab';
import { CollabFurniture, PlacedFurniture } from '../types';
import { localToWorld, worldToLocal } from '../scene/rooms';

function toPlacedFurniture(cf: CollabFurniture, defaultScene: string): PlacedFurniture {
  const scene = cf.scene || defaultScene;
  const localPos = worldToLocal(scene, cf.pos);
  return {
    model_id: cf.prefab,
    image: '',
    category: {
      category: '',
      style: '',
      material: null,
      model_id: cf.prefab,
      'super-category': '',
      theme: null,
    },
    instanceId: cf.objectId,
    objectId: cf.objectId,
    ownerId: '',
    isRemote: true,
    position: localPos,
    rotation: [cf.rot.x, cf.rot.y, cf.rot.z],
    scene,
  };
}

export function useCollabSync() {
  const collabEnabled = useStore((s) => s.collabEnabled);
  const setCollabConnected = useStore((s) => s.setCollabConnected);
  const setClientId = useStore((s) => s.setClientId);
  const setOnlineUsers = useStore((s) => s.setOnlineUsers);
  const clientIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!collabEnabled) {
      collabClient.disconnect();
      setCollabConnected(false);
      setClientId(null);
      setOnlineUsers(0);
      return;
    }

    collabClient.connect({
      onOpen: () => {
        setCollabConnected(true);
      },
      onClose: () => {
        setCollabConnected(false);
      },
      onMessage: (msg) => {
        const state = useStore.getState();
        const currentScene = state.currentScene;

        switch (msg.type) {
          case 'welcome':
            clientIdRef.current = msg.userId;
            setClientId(msg.userId);
            break;

          case 'sync_full':
            for (const cf of msg.state) {
              const scene = cf.scene || currentScene;
              const exists =
                scene === currentScene
                  ? state.placedItems.some((p) => p.objectId === cf.objectId)
                  : (state.savedScenes[scene] || []).some(
                      (p) => p.objectId === cf.objectId,
                    );
              if (!exists) {
                const item = toPlacedFurniture(cf, currentScene);
                if (scene === currentScene) {
                  state.addPlacedItem(item);
                } else {
                  state.addToSavedScene(scene, item);
                }
              }
            }
            break;

          case 'create_furniture':
            if (msg.from !== clientIdRef.current) {
              const scene = msg.payload.scene || currentScene;
              const exists =
                scene === currentScene
                  ? state.placedItems.some(
                      (p) => p.objectId === msg.payload.objectId,
                    )
                  : (state.savedScenes[scene] || []).some(
                      (p) => p.objectId === msg.payload.objectId,
                    );
              if (!exists) {
                const item = toPlacedFurniture(msg.payload, currentScene);
                if (scene === currentScene) {
                  state.addPlacedItem(item);
                } else {
                  state.addToSavedScene(scene, item);
                }
              }
            }
            break;

          case 'drag_update':
            if (msg.from !== clientIdRef.current) {
              const localItem = state.placedItems.find(
                (p) => p.objectId === msg.payload.objectId,
              );
              if (localItem) {
                const scene = localItem.scene || currentScene;
                const localPos = worldToLocal(scene, msg.payload.pos);
                state.updateItemPosition(localItem.instanceId, localPos);
              }
            }
            break;

          case 'delete_furniture':
            if (msg.from !== clientIdRef.current) {
              const localItem = state.placedItems.find(
                (p) => p.objectId === msg.payload.objectId,
              );
              if (localItem) {
                state.removePlacedItem(localItem.instanceId);
              }
            }
            break;

          case 'user_online':
            setOnlineUsers(state.onlineUsers + 1);
            break;

          case 'user_offline':
            setOnlineUsers(Math.max(0, state.onlineUsers - 1));
            break;
        }
      },
      onError: () => {
        setCollabConnected(false);
      },
    });

    return () => {
      collabClient.disconnect();
      setCollabConnected(false);
      setClientId(null);
      setOnlineUsers(0);
    };
  }, [collabEnabled]);
}

export function sendCreateFurniture(
  prefab: string,
  pos: { x: number; y: number; z: number },
  rot: { x: number; y: number; z: number },
  objectId: string,
  scene?: string,
) {
  const s = scene || useStore.getState().currentScene;
  const worldPos = localToWorld(s, [pos.x, pos.y, pos.z]);
  collabClient.send({
    type: 'create_furniture',
    from: '',
    payload: {
      objectId,
      prefab,
      pos: { x: worldPos[0], y: worldPos[1], z: worldPos[2] },
      rot: { ...rot, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      version: 1,
      scene: s,
    },
    srvTs: Date.now(),
  } as any);
}

export function sendDragUpdate(
  objectId: string,
  pos: { x: number; y: number; z: number },
  rot: { x: number; y: number; z: number },
  scene?: string,
) {
  const s = scene || useStore.getState().currentScene;
  const worldPos = localToWorld(s, [pos.x, pos.y, pos.z]);
  collabClient.send({
    type: 'drag_update',
    from: '',
    payload: {
      objectId,
      pos: { x: worldPos[0], y: worldPos[1], z: worldPos[2] },
      rot: { ...rot, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      version: 1,
      scene: s,
    },
    srvTs: Date.now(),
  } as any);
}

export function sendDeleteFurniture(objectId: string) {
  collabClient.send({
    type: 'delete_furniture',
    from: '',
    payload: { objectId },
    srvTs: Date.now(),
  } as any);
}
