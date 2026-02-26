# Global Working Hours & Wealth: A Data Visualization Dashboard

**By:** Christian Graber
**Live Application:** [Here](https://grabercn.github.io/D3-Data-Vis-Project-1/)
**Demo Video:** []()
* Make sure your video shows you clicking the map, opening the custom dropdown, and dragging the brush!

## Table of Contents
* [Motivation](#motivation)
* [The Data](#the-data)
* [Sketches & Design](#sketches--design)
* [Visualization Components](#visualization-components)
* [Discoveries](#discoveries)
* [Process & Architecture](#process--architecture)
* [Challenges & Future Work](#challenges--future-work)
* [AI & Collaboration](#ai--collaboration)

---

## Motivation
* **Prompt:** I wanted to explore the relationship between a country's wealth and the average hours its citizens work. Does more wealth equal more leisure time, or do wealthier nations work harder? With this question, I hoped the data from Our World in Data could uncover, by making both seperate and overlapping chart data. I also wanted to make sure that users had some choices when it came to seeing how the data is displayed so they could discover their own trends.
* **Goal:** This Dashboard allows users to discover the data at their own pace, while providing simple yet data complex charts that breakdown the data points in easy to digest ways.

## The Data
* **Source:** All data comes from [Our World in Data](https://ourworldindata.org/) datasets downloaded as CSV from the website directly.
* **Attributes:** The two main attributes being compared and displayed are the "Working hours per worker" and "GDP per capita" in this case.
* **Preprocessing:** In order to show the data efficiently as well as their overlap, I had to use Python to merge the data sets by both Year and Country Code as well as filtering out null, outliers, and data with no overlap, starting from 1950.

## Sketches & Design
<img width="826" height="957" alt="image" src="https://github.com/user-attachments/assets/1957715b-2279-44ed-aa56-235fdce7d3af" />
* **Explanation:** My current chart took quite a detour from my original plan, as I tinkered and realized I needed more detail on my charts to show the data the way I wanted to. The main difference being, I realized that in order for this to be effective I needed to show the change in data over the years as well, otherwise it would be hard to follow any trends effectively. In realizing this, I decided to change the layout slightly from my above initial sketch, opting for a large map on top and a split 3 way graph on the bottom, so better show all the data in one easier to see view. This also allows the user to scroll the year on the bottom and see the data set animating in real time as it changes. I felt this change to be the most optimal way to show the data and how it changes over time.

## Visualization Components
* **The Global Map (Choropleth):**
<img width="2443" height="1166" alt="image" src="https://github.com/user-attachments/assets/ae9c3c27-68a6-4448-b299-0f6382e97d2a" />

I designed this map in order to show how countries compare to each other based on the selected data set (GDP PC or Working Hours) using a color gradient starting its standard deviation at the lowest point in the dataset being displayed to the highest. This was done with easy to understand colors, so a legend is not needed here. Some extra convinience features include the hover tooltip, which shows the exact data values if the user wants more detail, and allows for better comparisons, as well as the click to filter, which isolates the country across all charts. This also includes a multiselect via ctrl(cmd)+click for convinience.

* **Timeline (Scatterplot):**
<img width="772" height="683" alt="image" src="https://github.com/user-attachments/assets/f9221a17-d29a-43ab-be0d-c4cb7d69a543" />

This chart is here to provide trends over time on either Working Hours or GDP from the selected year set, on a per year basis per value. The trend is tracked per country, per value. Each country has a corresponding color mapped to it that is used across all data charts consistently. Beyond that, it scales based upon the timeline below it as well. This chart also allows, similar to the map, isolation by country by clicking it, or selecting multiple via a ctrl(cmd)+click. 

* **Distribution (Histogram):** 
<img width="783" height="693" alt="image" src="https://github.com/user-attachments/assets/17c4170f-18a8-45ae-b84e-75c854e50fd6" />

This chart exists to show the distribution of each country over the lowest to highest values in the dataset, as they compare to others via country count. This allows the user to determine how their selected country stacks up compared to every other in the set at a glance. This can be shown when a country is selected, the distribution it is located in is highlighted.

* **Correlation (Scatterplot):**
<img width="771" height="700" alt="image" src="https://github.com/user-attachments/assets/32cd52f3-71dd-44e2-81fb-411df6e629e7" />

This is the arguably most important graph, as it shows the direct relationship between both data sets over each other, via GDP PC vs Work Hours. This allows for the reveal of direct relationships between the datasets without needing to switch back and forth. This graph is where the brush comes in, allowing for a sweep of multiple countries, highlighting them accross all graphs for an easy deep dive into the data. The tooltip also shows the direct data from each of these countries as it pertains to its average over the year set selected on the timeline. This allows the user to change the timeline to idenfity trends as it animates when changed, between the sets. 

* **Timeline (Range):**
<img width="2416" height="240" alt="image" src="https://github.com/user-attachments/assets/6c42f15a-f851-405a-92e4-6ad5df61389b" />

This is the secret weapon of the whole chart collection, a draggable and flexable timeline, allowing the user to transform and manipulate the range of the data easily and graphically. The advantage is this allows the user to isolate the data to specific years, such as years of crises or major events, and see changes on that scale. But it also allows the user to browse the whole extent of the data set as well via its expandable range (top and bottom) and its slideable nature. The whole chart animates as the data changes, allowing the user to see how the average moves and the data comes in and out of view.

* **Interactions (Brushing & Linking):**
<img width="1939" height="478" alt="image" src="https://github.com/user-attachments/assets/4d507817-a2eb-4997-bf61-e77c8c47da52" />
<img width="553" height="375" alt="image" src="https://github.com/user-attachments/assets/a82816c3-69ad-495b-b373-f97b427c5c4e" />
<img width="631" height="591" alt="image" src="https://github.com/user-attachments/assets/e81c2167-dc26-4f05-8539-bff28c03bbd7" />

As mentioned above, this chart features several different methods to interact with it. The most prominant, is the clicking on the map to isolate a country by itself. But also above the map there is a dropdown menu which allows a reset and multi-select if the user is not familiar with the click interactions. Along with this, as mentioned earlier, is the control click method avaliable to multi-select on both the Timeline and Map plots. The brush is used on both the Histogram and Correlation plots to allow the user to multi-select on those charts if they see data that may pop out to them. Lastly, the timeline 

Detail the "Pro" features. Explain how dragging a brush on the correlation chart highlights those specific countries across *all* other charts. Mention the custom multi-select checkbox menu and the `Ctrl+Click` precision selection.

## Discoveries
> **💡 Writing Tip:** Show off what the app actually does! Provide 2-3 specific insights you found while playing with your finished app. **Include a screenshot for each finding.**
* **Idea 1:** Select a wealthy country (like the US or Switzerland) and compare its working hours to a developing nation. What does the correlation chart show?
* **Idea 2:** Drag the Master Timeline brush at the bottom to compare the 1980s to the 2010s. Did global working hours generally go down as GDP went up?

## Process & Architecture
> **💡 Writing Tip:** Talk about the tech stack.
* **Libraries:** D3.js (v6/v7), standard HTML, CSS, and Vanilla JavaScript.
* **Structure:** Explain that the layout is handled by CSS Grid/Flexbox in a dark-theme dashboard, while D3 handles data binding and SVG rendering. 
* **Hosting:** Mention that the code is version-controlled on GitHub and deployed live via Vercel.

## Challenges & Future Work
> **💡 Writing Tip:** Be honest about the hard parts! Instructors love seeing how you solved problems.
* **Challenge 1 - The Z-Index War:** Talk about the struggle of getting the D3 Brush overlay to work alongside clickable scatterplot dots. Explain how we had to use mathematical "Nearest Neighbor" logic (`Math.hypot`) to allow the brush to "see through" itself to find the dots underneath for tooltips.
* **Challenge 2 - Opacity Stacking:** Mention how drawing 100+ unselected circles on top of each other created a solid wall of color, and how you solved it by dropping the opacity to `0.02` and using D3's `.raise()` function to pull selected countries to the front.
* **Future Work:** What would you add if you had another week? (e.g., Animated transitions when swapping decades, adding a third variable like population size for the bubble radius).

## AI & Collaboration
> **💡 Writing Tip:** Answer the rubric prompt directly.
* **AI Usage:** "I used AI as a pair-programming assistant to help troubleshoot complex D3.js interactions, specifically solving event bubbling issues (`e.stopPropagation()`) and calculating the math required for the nearest-neighbor tooltips underneath the D3 brush layer."
* **Collaboration:** Acknowledge any classmates who helped you bounce ideas around.
