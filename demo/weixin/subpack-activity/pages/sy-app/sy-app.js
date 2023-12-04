import api from "./api";

const app = getApp();
const { connect } = app.Store;

const page = {
    data: {
        imageSrc: "",
    },
    onLoad(options) {
        const { id, source } = options;
        const sourceMap = ["APP导流私域", "小程序导流私域"];
        api.getPageInfo({ id }).then((res) => {
            console.log(res);
            res = res || {};
            const { data = {} } = res;

            const value = data.value || "";
            let valueData = {};
            try {
                valueData = JSON.parse(value);
            } catch (e) {
                // console.log(e)
                valueData = {};
            }

            this.setData({
                imageSrc: valueData.share_img,
            });

            app.kksaTrack("CommonPageOpen", {
                CurPage: "导流私域页面",
                ActivityName: sourceMap[source],
            });
        });
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
