/**
 * Стратегии загрузки модулей
 */
export declare enum ModuleLoadStrategy {
    /**
     * Блокирующая стратегия. Не будет дан старт приложению до тех пор,
     * пока не загрузятся все блокирующие модули
     */
    BLOCK = "block",
    /**
     * Неблокирующая стратегия, модули начнут загружаться после того, как будет дан старт приложению
     */
    IMMEDIATELY = "immediately",
    /**
     * Стратегия загрузки сервисов по запросу, автоматически не грузятся
     */
    ON_DEMAND = "on_demand",
    /**
     * Стартегия загрузки сервисов лениво, по доступности.
     * Доступность командуется извне, например из сервис-воркера если например пять секунд не было запросов сети
     */
    LAZY = "lazy"
}

/**
 * Базовые поля, необходимые каждому манифесту
 */
export declare type TBaseModuleManifest<TUserAddition = {}, TChild = {}> = {
    name: string;
    loadStrategy: ModuleLoadStrategy;
    fileName: string;
    childs?: Array<TChild>;
    modules?: Record<string, TBaseModuleManifest<TUserAddition>>;
} & TUserAddition;

export enum T15ModuleType {
  /**
   * Модуль, хранящий компонент. Компонент встаавляется через lazy-component. Может использоваться везде.
   */
  COMPONENT = 'component',

  /**
   * Модуль, хранящий роут, который лежит на корневом уровне наравне с лэйаутом и логином
   */
  ROOT_ROUTE = 'root_route',

  /**
   * Модуль, хранящий роут, который доступен для всех без авторизации, не входит в лэйаут
   */
  PUBLIC_ROOT_ROUTE = 'public_root_route',

  /**
   * Модуль, хранящий роут, который всплывает снизу экрана и занимает всю страницу
   */
  MODAL_ROUTE = 'modal_route',

  /**
   * Модуль или ребенок модуля, который делает высплывашку, доступную без авторизации
   */
  PUBLIC_MODAL_ROUTE = 'public_modal_route',

  /**
   * Модуль, хранящий роут, который занимает место в контенте лэйаута
   */
  LAYOUT_ROUTE = 'layout_route',

  /**
   * Модуль, который хранит код, который стартует через start
   */
  SERVICE = 'service'
}

export type TNotRoutedModuleType =
  | T15ModuleType.COMPONENT
  | T15ModuleType.SERVICE;

export type TRouteModuleType =
  | T15ModuleType.ROOT_ROUTE
  | T15ModuleType.PUBLIC_ROOT_ROUTE
  | T15ModuleType.MODAL_ROUTE
  | T15ModuleType.PUBLIC_MODAL_ROUTE
  | T15ModuleType.LAYOUT_ROUTE;

/**
 * Базовый тип-родитель для всех чайлдов микросервиса
 * Каждый чайлд имеет функцию, возвращающую компонент
 */
export type TBaseChildrenMetadata = {
  componentFn: string;
};

/**
 * Чайлд микросервиса, который что-то рендерит, но не роут
 */
export type TRenderableChildren = TBaseChildrenMetadata & {
  type: T15ModuleType.COMPONENT;
};

/**
 * Чайлд микросервиса, который регистрирует новый роут
 */
export type TRouteChildren = TBaseChildrenMetadata & {
  type: TRouteModuleType;
  route: string;
};

/**
 * Чайлд микросервиса, регистрируется в манифесте в секции childs как элемент массива.
 * Обязательно содержит type - тип сервиса и componentFn - функцию из экспортов, возвращающую компонент
 */
export type TChildrenMetadata = TRenderableChildren | TRouteChildren;

export type T15ModuleBase = {
  enabled: boolean;
  cssFileName?: string;
  useModules?: Array<string>;
  blockModules?: Array<string>;
};

export type T15Module = T15ModuleBase & { type: TNotRoutedModuleType; };

export type T15RoutedModule = T15ModuleBase & {
  type: TRouteModuleType;
  route: string;
};

export type T15ModuleAddition = T15Module | T15RoutedModule;

export type T15Manifest = TBaseModuleManifest<T15ModuleAddition, TChildrenMetadata>;
