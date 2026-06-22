import { AdminConfig } from './admin.types';

interface SourceEntry {
  name: string;
  api: string;
  detail: string;
}

// 默认视频源列表
const defaultApiSites: Record<string, SourceEntry> = {
  "iqiyizyapi.com": { name: "🎬-爱奇艺-", api: "https://iqiyizyapi.com/api.php/provide/vod", detail: "https://iqiyizyapi.com" },
  "mtzy.me": { name: "🎬茅台资源", api: "https://caiji.maotaizy.cc/api.php/provide/vod", detail: "https://mtzy.me" },
  "wolongzyw.com": { name: "🎬卧龙资源", api: "https://wolongzyw.com/api.php/provide/vod", detail: "https://wolongzyw.com" },
  "ikunzy.com": { name: "🎬iKun资源", api: "https://ikunzyapi.com/api.php/provide/vod", detail: "https://ikunzy.com" },
  "dyttzyapi.com": { name: "🎬电影天堂", api: "http://caiji.dyttzyapi.com/api.php/provide/vod", detail: "http://caiji.dyttzyapi.com" },
  "www.maoyanzy.com": { name: "🎬猫眼资源", api: "https://api.maoyanapi.top/api.php/provide/vod", detail: "https://www.maoyanzy.com" },
  "cj.lzcaiji.com": { name: "🎬量子资源", api: "https://cj.lzcaiji.com/api.php/provide/vod", detail: "https://cj.lzcaiji.com" },
  "360zy.com": { name: "🎬360 资源", api: "https://360zyzz.com/api.php/provide/vod", detail: "https://360zy.com" },
  "jszyapi.com": { name: "🎬极速资源", api: "https://jszyapi.com/api.php/provide/vod", detail: "https://jszyapi.com" },
  "www.moduzy.net": { name: "🎬魔都资源", api: "https://www.mdzyapi.com/api.php/provide/vod", detail: "https://www.moduzy.net" },
  "ffzyapi.com": { name: "🎬非凡资源", api: "https://api.ffzyapi.com/api.php/provide/vod", detail: "https://cj.ffzyapi.com" },
  "bfzy.tv": { name: "🎬暴风资源", api: "https://bfzyapi.com/api.php/provide/vod", detail: "https://bfzy.tv" },
  "zuida.xyz": { name: "🎬最大资源", api: "https://api.zuidapi.com/api.php/provide/vod", detail: "https://zuida.xyz" },
  "wujinzy.me": { name: "🎬无尽资源", api: "https://api.wujinapi.me/api.php/provide/vod", detail: "https://wujinzy.com" },
  "xinlangapi.com": { name: "🎬新浪资源", api: "https://api.xinlangapi.com/xinlangapi.php/provide/vod", detail: "https://xinlangapi.com" },
  "api.wwzy.tv": { name: "🎬旺旺资源", api: "https://api.wwzy.tv/api.php/provide/vod", detail: "https://api.wwzy.tv" },
  "www.subozy.com": { name: "🎬速播资源", api: "https://subocaiji.com/api.php/provide/vod", detail: "https://www.subozy.com" },
  "jinyingzy.com": { name: "🎬金鹰点播", api: "https://jinyingzy.com/api.php/provide/vod", detail: "https://jinyingzy.com" },
  "p2100.net": { name: "🎬飘零资源", api: "https://p2100.net/api.php/provide/vod", detail: "https://p2100.net" },
  "api.ukuapi88.com": { name: "🎬U酷影视", api: "https://api.ukuapi88.com/api.php/provide/vod", detail: "https://www.ukuzy.com" },
  "api.guangsuapi.com": { name: "🎬光速资源", api: "https://api.guangsuapi.com/api.php/provide/vod", detail: "https://api.guangsuapi.com" },
  "www.hongniuzy.com": { name: "🎬红牛资源", api: "https://www.hongniuzy2.com/api.php/provide/vod", detail: "https://www.hongniuzy.com" },
  "caiji.moduapi.cc": { name: "🎬魔都动漫", api: "https://caiji.moduapi.cc/api.php/provide/vod", detail: "https://caiji.moduapi.cc" },
  "www.ryzyw.com": { name: "🎬如意资源", api: "https://pz.v88.qzz.io/?url=https://cj.rycjapi.com/api.php/provide/vod", detail: "https://www.ryzyw.com" },
  "www.haohuazy.com": { name: "🎬豪华资源", api: "https://pz.v88.qzz.io/?url=https://hhzyapi.com/api.php/provide/vod", detail: "https://www.haohuazy.com" },
  "bdzy1.com": { name: "🎬百度云zy", api: "https://pz.v88.qzz.io/?url=https://api.apibdzy.com/api.php/provide/vod", detail: "https://bdzy1.com" },
  "lovedan.net": { name: "🎬艾旦影视", api: "https://pz.v88.qzz.io/?url=https://lovedan.net/api.php/provide/vod", detail: "https://lovedan.net" },
  "91md.me": { name: "🔞麻豆视频", api: "https://91md.me/api.php/provide/vod", detail: "https://91md.me" },
  "lbapiby.com": { name: "🔞--AIvin-", api: "http://lbapiby.com/api.php/provide/vod", detail: "http://lbapiby.com" },
  "155zy2.com": { name: "🔞155-资源", api: "https://155api.com/api.php/provide/vod", detail: "https://155zy2.com" },
  "apiyutu.com": { name: "🔞玉兔资源", api: "https://apiyutu.com/api.php/provide/vod", detail: "https://apiyutu.com" },
  "fhapi9.com": { name: "🔞番号资源", api: "http://fhapi9.com/api.php/provide/vod", detail: "http://fhapi9.com" },
  "apilsbzy1.com": { name: "🔞-老色逼-", api: "https://apilsbzy1.com/api.php/provide/vod", detail: "https://apilsbzy1.com" },
  "www.yytv4.cc": { name: "🔞优优资源", api: "https://www.yytv4.cc/api.php/provide/vod", detail: "https://www.yytv4.cc" },
  "xiaojizy.live": { name: "🔞小鸡资源", api: "https://api.xiaojizy.live/provide/vod", detail: "https://xiaojizy.live" },
  "hsckzy.xyz": { name: "🔞黄色仓库", api: "https://hsckzy.xyz/api.php/provide/vod", detail: "https://hsckzy.xyz" },
  "apidanaizi.com": { name: "🔞-大奶子-", api: "https://apidanaizi.com/api.php/provide/vod", detail: "https://apidanaizi.com" },
  "jkunzyapi.com": { name: "🔞jkun资源", api: "https://jkunzyapi.com/api.php/provide/vod", detail: "https://jkunzyapi.com" },
  "lbapi9.com": { name: "🔞乐播资源", api: "https://lbapi9.com/api.php/provide/vod", detail: "https://lbapi9.com" },
  "Naixxzy.com": { name: "🔞奶香资源", api: "https://Naixxzy.com/api.php/provide/vod", detail: "https://Naixxzy.com" },
  "slapibf.com": { name: "🔞森林资源", api: "https://beiyong.slapibf.com/api.php/provide/vod", detail: "https://slapibf.com" },
  "apilj.com": { name: "🔞辣椒资源", api: "https://pz.v88.qzz.io/?url=https://apilj.com/api.php/provide/vod", detail: "https://apilj.com" },
  "shayuapi.com": { name: "🔞鲨鱼资源", api: "https://shayuapi.com/api.php/provide/vod", detail: "https://shayuapi.com" },
  "didizy.com": { name: "🔞滴滴资源", api: "https://api.ddapi.cc/api.php/provide/vod", detail: "https://didizy.com" },
  "heiliaozy.cc": { name: "🔞黑料资源", api: "https://www.heiliaozyapi.com/api.php/provide/vod", detail: "https://heiliaozy.cc" },
  "api.bwzym3u8.com": { name: "🔞百万资源", api: "https://api.bwzyz.com/api.php/provide/vod", detail: "https://api.bwzym3u8.com" },
  "thzy8.me": { name: "🔞桃花资源", api: "https://thzy1.me/api.php/provide/vod", detail: "https://thzy8.me" },
  "www.jingpinx.com": { name: "🔞精品资源", api: "https://www.jingpinx.com/api.php/provide/vod", detail: "https://www.jingpinx.com" },
  "souavzyw.com": { name: "🔞souavZY", api: "https://api.souavzyw.net/api.php/provide/vod", detail: "https://api.souavzyw.net" },
};

export function createDefaultConfig(): AdminConfig {
  const configFile = { cache_time: 7200, api_site: defaultApiSites };
  return {
    ConfigFile: JSON.stringify(configFile),
    ConfigSubscribtion: { URL: "", AutoUpdate: false, LastCheck: "" },
    SiteConfig: {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTV',
      Announcement: process.env.ANNOUNCEMENT || '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
      SearchDownstreamMaxPage: Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: 7200,
      DoubanProxyType: process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent',
      DoubanProxy: process.env.NEXT_PUBLIC_DOUBAN_PROXY || '',
      DoubanImageProxyType: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE || 'cmliussss-cdn-tencent',
      DoubanImageProxy: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '',
      DisableYellowFilter: process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
      FluidSearch: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
      EnableWebLive: false,
    },
    UserConfig: {
      Users: [{ username: process.env.USERNAME || 'admin', role: 'owner', banned: false }],
    },
    SourceConfig: Object.entries(defaultApiSites).map(([key, site]) => ({
      key,
      name: site.name,
      api: site.api,
      detail: site.detail,
      from: 'config' as const,
      disabled: false,
    })),
    CustomCategories: [],
    LiveConfig: [],
  };
}
