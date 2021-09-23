import { filterFullMatchSearchResults } from "src/lib/search-helper";
import surahList from "src/data/surah-list";

export async function fetchSurah(context, surahId) {
  context.commit("showLoading", "fetchSurah");

  const chapter = surahList.find(item => item.id == surahId);

  const urls = [
    {
      url: "quran/verses/uthmani",
      params: {
        chapter_number: surahId
      }
    },
    {
      url: "quran/translations/33",
      params: {
        chapter_number: surahId,
        fields: "verse_number"
      }
    }
  ];

  const requests = [];
  urls.forEach(url => {
    requests.push(
      new Promise((resolve, reject) => {
        this.$httpQuran({
          url: url.url,
          params: url.params
        })
          .then(res => {
            resolve(res.data);
          })
          .catch(err => {
            console.log(err);
            reject(err);
          });
      })
    );
  });

  return Promise.all(requests)
    .then(values => {
      const arabics = values[0].verses.map(verse => {
        return {
          ...verse,
          verse_number: parseInt(verse.verse_key.split(":")[1])
        };
      });
      const translations = values[1].translations;
      const merged = Object.assign({ ayahs: arabics, translations }, chapter);
      context.commit("updateSurah", merged);
      context.commit("hideLoading", "fetchSurah");
    })
    .catch(err => {
      console.log(err);
      context.commit("hideLoading", "fetchSurah");
    });
}

export async function searchByAyah(context, { keyword, page = 1 }) {
  context.commit("showLoading", "searchAyah");

  const perPage = context.state.searchAyah.paging.perPage;

  return new Promise((resolve, reject) => {
    this.$httpQuran({
      url: "search",
      params: {
        query: keyword,
        size: perPage,
        page: page
      }
    })
      .then(res => {
        if (res.status == 204) {
          context.commit("hideLoading", "searchAyah");
          resolve({
            results: []
          });
          return;
        }

        const data = res.data.search;
        const paging = {
          total: data.total_results,
          perPage: perPage,
          totalPage: data.total_pages,
          currentPage: page
        };

        let results = data.results;

        // Filtering full match keyword
        if (context.state.searchAyah.fullMatch) {
          results = filterFullMatchSearchResults(results, keyword);

          // Loop until found any data
          if (results.length == 0 && page < paging.totalPage) {
            context.dispatch("searchByAyah", { keyword, page: page + 1 });
            return;
          }
        }

        // Appending surah name, ayah number & translation
        for (let i = 0; i < results.length; i++) {
          const item = results[i];

          const verseKeys = item.verse_key.split(":");
          const surah = surahList.find(s => s.id == verseKeys[0]);
          results[i].surahId = surah.id;
          results[i].surahName = surah.nameSimple;
          results[i].ayahNumber = verseKeys[1];

          this.$httpQuran({
            url: "quran/translations/33",
            params: {
              verse_key: item.verse_key
            }
          }).then(resT => {
            context.commit("addSearchAyahResultsTranslation", {
              verse_key: item.verse_key,
              text: resT.data.translations[0].text
            });
          });
        }

        context.commit("updateSearchAyahPaging", paging);
        context.commit("addSearchAyahResults", results);
        context.commit("hideLoading", "searchAyah");
        resolve({
          results,
          paging
        });
      })
      .catch(err => {
        context.commit("hideLoading", "searchAyah");
        reject(err);
      });
  });
}

export function resetSearchAyahResults(context) {
  context.commit("resetSearchAyahResults");
}

export function resetSearchAyahPaging(context) {
  context.commit("resetSearchAyahPaging");
}

export function setFullMatchSearch(context, value) {
  context.commit("setFullMatchSearch", value);
}

export function setPageScrollPosition(context, info) {
  context.commit("updatePageScrollPosition", info);
}

export function removePageScrollPosition(context, page) {
  context.commit("removePageScrollPosition", page);
}

export function changeAudioReciterId(context, reciterId) {
  context.commit("changeAudioReciterId", reciterId);
}