declare global {
  type TPlacementOptions = {
    handler?: string;
    type: string; //TODO: Конкретные значения
    title: string;
    params?: unknown;
    // action: string;
    entity: string;
    path?: string;
    menuId?: number;
    viewMode: ViewMode;
    [index: string]: unknown;
  };

  interface Window {
    _ACCESS_TOKEN_: string;
    _PARAMS_: {
      placement: string;
      placementOptions: TPlacementOptions;
    };
    _APP_URL_: string;
    _HOSTNAME_: string;
  }

  declare const BX24: {
    openPath: (path: string, callback?: (...args: unknown[]) => void) => void;
    openApplication: (
      params: { bx24_width?: string | number; [index: string]: unknown },
      callback?: () => void
    ) => void;
    closeApplication: () => void;
    getScrollSize: () => { scrollWidth: number; scrollHeight: number };
    resizeWindow: (width: number, height: number, cb?: unknown) => void;
  };
}

export {}