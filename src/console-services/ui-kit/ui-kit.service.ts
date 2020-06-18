import { Command, Console } from 'nestjs-console';
import { upgradeIcons } from './upgrade-icons';

@Console({
  name: 'ui-kit',
  description: 'Утилиты для работы с UI Kit'
})
export class UiKitService {
  @Command({
    command: 'upgrade-icons',
    description: 'Обновление иконок UI Kit v1 и v2 на @tochka-modules/t15-ui-kit-icons'
  })
  async upgradeIcons() {
    upgradeIcons();
  }
}
