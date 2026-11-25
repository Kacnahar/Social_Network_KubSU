import { can } from '@app/shared';
import { Tabs } from 'expo-router';
import { useSignedIn } from '../../lib/session';
import { TabBarSpaceProvider } from '../../ui/components';
import { TabBar } from '../../ui/TabBar';

// Приложение открывается на ленте (первая вкладка панели)
export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  const { account } = useSignedIn();
  return (
    <TabBarSpaceProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        {/* На панели пять вкладок: Лента, Каталог, Войс, 3D карта, Профиль (см. ui/TabBar) */}
        <Tabs.Screen name="index" />
        <Tabs.Screen name="catalog" />
        {/* Недоступные роли вкладки убираем из навигатора: по прямому адресу её нет; на панели «Войс» остаётся неактивным */}
        <Tabs.Protected guard={can(account.role, 'rooms')} redirectTo="/">
          <Tabs.Screen name="voice" />
        </Tabs.Protected>
        <Tabs.Screen name="map" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </TabBarSpaceProvider>
  );
}
