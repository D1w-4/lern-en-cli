import { AnalyticsPackageDefault, AnalyticsWorker } from '@tochka-modules/analytics';

@AnalyticsWorker({ category: '<%- category%>' })
export class <%- className%> {<%
events.forEach((event) => { %>
  static <%- event.methodName%>(): AnalyticsPackageDefault {
    return {
      action: '<%= event.action%>'<%
      if (event.goal) { %>,
      goal: true<%
      } %><%
      if (event.label) { %>,
      label: '<%- event.label%>'<%
      } %>
    };
  }
<% })
%>}
