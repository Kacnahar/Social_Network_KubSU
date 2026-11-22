import { can } from '@app/shared';
import { Tabs } from 'expo-router';
import { useSignedIn } from '../../lib/session';
import { TabBarSpaceProvider } from '../../ui/components';
import { TabBar } from '../../ui/TabBar';

export default function TabsLayout() {
  const { account } = useSignedIn();
  return (
    <TabBarSpaceProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        {/* Недоступные роли вкладки убираем из навигатора: ни на панели, ни по прямому адресу их нет */}
        <Tabs.Protected guard={can(account.role, 'rooms')} redirectTo="/">
          <Tabs.Screen name="voice" />
        </Tabs.Protected>
        <Tabs.Protected guard={can(account.role, 'publish')} redirectTo="/">
          <Tabs.Screen name="create" />
        </Tabs.Protected>
        <Tabs.Screen name="profile" />
      </Tabs>
    </TabBarSpaceProvider>
  );
}
