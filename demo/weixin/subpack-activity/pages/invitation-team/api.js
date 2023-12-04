import { util_request } from "../../../util.js";

const app = getApp();
const global = app.globalData;

// 主接口，https://yapi.quickcan.com/project/438/interface/api/89796
const getTeamInfo = ({ activity_id = "", captain_mini_id = "", captain_user_id = "", team_id = "" } = {}) => {
    let url = `/v1/business/activity/fission/team_info`;
    let method = "get";
    let host = "api";
    let data = {
        activity_id,
        captain_mini_id: captain_mini_id ? `${global.channel}:${captain_mini_id}` : "",
        captain_user_id,
        team_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 获取队伍ID，https://yapi.quickcan.com/project/438/interface/api/59353
const getTeamId = ({ activity_id = "" } = {}) => {
    let url = `/v1/business/activity/fission/create_team`;
    let method = "post";
    let host = "api";
    let data = {
        activity_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 给队长助力 https://yapi.quickcan.com/project/438/interface/api/59398
const postCaptain = ({ team_id = "" } = {}) => {
    let url = `/v1/business/activity/fission/assistance_captain`;
    let method = "post";
    let host = "api";
    let data = {
        team_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 领奖接口 https://yapi.quickcan.com/project/438/interface/api/90328
const postAssign = ({ award_record_id = "" } = {}) => {
    let url = `/v1/business/activity/fission/assign_award`;
    let method = "post";
    let host = "api";
    let data = {
        award_record_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export { getTeamInfo, getTeamId, postCaptain, postAssign };
