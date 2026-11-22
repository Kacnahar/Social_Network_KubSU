import { can } from '@app/shared';
import { Tabs } from 'expo-router';
import { useSignedIn } from '../../lib/session';
import { TabBarSpaceProvider } from '../../ui/components';
import { TabBar } from '../../ui/TabBar';

// Приложение открывается на ленте, хотя «Каталог» на панели стоит первым
export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  const { account } = useSignedIn();
  return (
    <TabBarSpaceProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        {/* На панели пять вкладок: Каталог, Лента, Войс, 3D карта, Профиль (см. ui/TabBar) */}
        <Tabs.Screen name="catalog" />
        <Tabs.Screen name="index" />
        {/* Недоступные роли вкладки убираем из навигатора: по прямому адресу её нет; на панели «Войс» остаётся неактивным */}
        <Tabs.Protected guard={can(account.role, 'rooms')} redirectTo="/">
          <Tabs.Screen name="voice" />
        </Tabs.Protected>
        <Tabs.Screen name="map" />
        <Tabs.Screen name="profile" />
        {/* «Создать» (история) открывается кружком «Ваша история»; на панели этой вкладки нет */}
        <Tabs.Protected guard={can(account.role, 'publish')} redirectTo="/">
          <Tabs.Screen name="create" />
        </Tabs.Protected>
      </Tabs>
    </TabBarSpaceProvider>
  );
}
