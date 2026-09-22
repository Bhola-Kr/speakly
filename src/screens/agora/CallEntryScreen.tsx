import { useLayoutEffect } from 'react';
import { useActiveCall } from '../../hooks/ActiveCallContext';

// The route launches the persistent call host; navigation never owns the engine.
export default function CallEntryScreen({ navigation, route }: any) {
  const { startCall } = useActiveCall();
  useLayoutEffect(() => {
    startCall(route.params ?? {});
    navigation.reset({
      index: 0,
      routes: [
        {
          name: route.params?.gender === 'female' ? 'FemaleBottomTabs' : 'Main',
        },
      ],
    });
  }, [navigation, route.params, startCall]);
  return null;
}
