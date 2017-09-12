const axios = require('axios');
const css = require('css');
const _ = require('underscore');

// let getProjectSha = _.throttle()

const foldersToIgnore = ['node_moduels','vendor','bower'];
const filesToIgnore = ['reset.css','normalize.css'];

const ignoreParts = [...foldersToIgnore, ...filesToIgnore];

const Q = {calls:[], addCall:function(cb, ...args){
    this.calls.push({cb, args});
}};

setInterval(()=>{
    if (Q.calls.length){
        let {cb, args} = Q.shift();
        // cb
    }
}, 1000*60);



// getProjectSha('BrackCarmony','EloEverything');

getRepos('BrackCarmony');

function getRepos(username){
    axios.get(`https://api.github.com/users/${username}/repos`).then(
        resp=>{
            let repos = resp.data;
            let filteredRepos = repos.filter(e=>"JavaScriptCSSHTML".indexOf(e.language)>-1);
            console.log(filteredRepos.length);
            filteredRepos.forEach((repo)=>{
                console.log(username, ' ------ ', repo.name);
                getProjectSha(username, repo.name)
            });
        }
    ).catch(err=>console.error(err));
}

function getProjectSha(username, repo){
    axios.get(`https://github.com/${username}/${repo}`).then(
        resp=>{
            let html = resp.data;
        let reg = new RegExp(/commit-tease-sha" href="\/.*commit\/([^"]+)/);
        let matches = reg.exec(html);
        if (!matches) return;
        let sha = matches[1];
        console.log("SHA: ", sha);

        getTreeFromSha(username, repo, sha);
        }
    ).catch(err=>console.error(err));
}

function getTreeFromSha(username, repo, sha){
    axios.get(`https://api.github.com/repos/${username}/${repo}/git/trees/${sha}?recursive=true`)
        .then(resp=>{
            console.log(resp.data);
            let tree = resp.data.tree;
            let cssNodes = getCssFromTree(tree);
            cssNodes.forEach(getCss.bind(null, username, repo, sha));
            console.log(cssNodes);
        }).catch(err=>console.error(err));
}

function getCssFromTree(tree){
    let cssFiles = tree.filter(e=>{
        // if an invaild folder or filename shows up in the path, ignore the file
        if (ignoreParts.reduce(
            (prev, cur)=>prev || e.path.indexOf(cur)>-1, 
            false)){
                return false;
            }
        if (e.path.slice(-4) == ".css")
            return true;
        return false;
    })

    return cssFiles;
}

function getCss(username, repo, sha, node){
    axios.get(`https://raw.githubusercontent.com/${username}/${repo}/${sha}/${node.path}`)
    .then(resp=>{
        let rawCss = resp.data;
        // console.log(rawCss);
        let {dict, length} = cleanCss(rawCss);
        let path = node.path.split("/");
        let name = path[path.length-1];
        console.log("Name: ", name);
        console.log("Length: ", length);
        console.log("Dict: ", dict);
        // saveCssInfo(username, repo, sha, name);
    }).catch(err=>console.error(err));
}

function cleanCss(rawCss){
    console.log('-----------------------------------------------\n', rawCss.length);
    length = rawCss.length;
    try{
        var obj = css.parse(rawCss);
    }catch(err){
        console.log(err);
        var obj = null;
    }
    
    if (!obj) return null;
    let dict = obj.stylesheet.rules.reduce(cssReducer, {});
    return {dict, length};
}

function cssReducer(dict, rule){
    if (rule.declarations){
        rule.declarations.reduce((p, c)=>{
            p[c.property]=(p[c.property]?p[c.property]+1:1)
            return p;
        }, dict)
        return dict;
    }
    if (rule.rules){
        return rule.rules.reduce(cssReducer, dict)
    }
    if (rule.keyframes){
        return rule.keyframes.reduce(cssReducer, dict)
    }
    return dict;
}

